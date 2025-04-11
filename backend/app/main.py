import os
from dotenv import load_dotenv
from fastapi import FastAPI, Query, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from typing import Dict, Optional
import logging
import sys
from sqlalchemy.orm import Session
from pathlib import Path
import time
import asyncio

from .database import engine, get_db
from .models import users, properties, user_inputs, user_saved_properties
from .auth.dependencies import get_current_user, get_current_user_optional
from .auth.utils import verify_password, get_password_hash, create_access_token
from .external_api.realty_in_the_us import RealtyInTheUS
from .items.user_inputs import get_default_user_inputs, UserInputs
from .items.calculated import PropertyCalculator
from .items.api_data import PropertyAPIData, create_property_api_data
from .config import settings

# Explicitly load environment variables
load_dotenv()  # Default path is the .env file in the current working directory

# Debug environment variables
print(f"Working directory: {os.getcwd()}")
print(f"Env file exists: {Path('.env').exists()}")
print(f"Env file absolute path: {Path('.env').absolute()}")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Create database tables
users.Base.metadata.create_all(bind=engine)
properties.Base.metadata.create_all(bind=engine)
user_inputs.Base.metadata.create_all(bind=engine)
user_saved_properties.Base.metadata.create_all(bind=engine)

app = FastAPI()

# Configure CORS with explicit origins for better security
origins = [
    "https://rentalcashflowpro.com",
    "https://www.rentalcashflowpro.com",
    "http://localhost:3000",  # for local development
]

# Log CORS settings
print(f"CORS allowed origins: {origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    max_age=86400,  # Cache preflight requests for 1 day
)

# Initialize API client
realty_client = RealtyInTheUS()

# Add class for rate limiting
class RateLimiter:
    def __init__(self, calls_per_second=1.1):
        self.calls_per_second = calls_per_second
        self.last_call_time = 0
        self.lock = asyncio.Lock()

    async def acquire(self):
        async with self.lock:
            current_time = time.time()
            time_passed = current_time - self.last_call_time
            if time_passed < 1/self.calls_per_second:
                await asyncio.sleep(1/self.calls_per_second - time_passed)
            self.last_call_time = time.time()

# Rate limiter instance creation
rate_limiter = RateLimiter(calls_per_second=1)  # limit to 1 call per second

@app.get("/")
async def root():
    return {"message": "Real Estate Analysis API"}

@app.get("/api/properties/search")
async def search_property(
    postal_code: str = None,
    city: str = None,
    state_code: str = None
) -> Dict:
    try:
        logger.info(f"Searching properties with postal_code: {postal_code}, city: {city}, state_code: {state_code}")
        await rate_limiter.acquire()  # apply Rate limiting 
        return await realty_client.search_properties(postal_code, city, state_code)
    except Exception as e:
        logger.error(f"Error in search_property: {str(e)}")
        if "429" in str(e):
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please try again later."
            )
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/properties/v3/detail")
async def get_property_detail(property_id: str) -> Dict:
    try:
        logger.info(f"Getting property detail for ID: {property_id}")
        await rate_limiter.acquire()  # Rate limiting 적용
        property_detail = await realty_client.get_property_detail(property_id)
        return property_detail
    except Exception as e:
        logger.error(f"Error in get_property_detail: {str(e)}")
        if "429" in str(e):
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please try again later."
            )
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/locations/v2/auto-complete")
async def autocomplete_location(
    input: str = Query(..., description="Search input (address, city, or ZIP code)"),
    limit: int = Query(10, description="Number of suggestions to return")
):
    try:
        logger.info(f"Autocomplete request with input: {input}")
        await rate_limiter.acquire()  # Apply rate limiting
        return await realty_client.autocomplete_location(input, limit)
    except Exception as e:
        logger.error(f"Error in autocomplete_location: {str(e)}")
        if "429" in str(e):
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please try again later."
            )
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/properties/gross-rents")
async def get_gross_rents(
    property_id: str
) -> float:
    try:
        logger.info(f"Calculating gross rents for property ID: {property_id}")
        gross_rents = 30000  # temporary value (we need to get something from the API)
        return gross_rents  
    except Exception as e:
        logger.error(f"Error calculating gross rents: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/properties/search-cashflow")
async def search_property_cashflow(
    postal_code: str = None,
    city: str = None,
    state_code: str = None,
    current_user: Optional[users.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
) -> Dict:
    try:
        logger.info(f"Searching properties with postal_code: {postal_code}, city: {city}, state_code: {state_code} (authenticated: {current_user is not None})")
        
        # Safely handle user_id
        try:
            user_id = current_user.id if current_user else None
        except:
            user_id = None
            logger.warning("Failed to get user ID, using None instead")
            
        # Add log for debugging
        logger.info(f"Using user_id: {user_id}")
        
        user_inputs = await get_default_user_inputs(user_id, db)
        
        # Search properties
        properties_response = await search_property(postal_code, city, state_code)
        
        if not properties_response.get("properties"):
            return {"properties": []}

        properties = []
        calculator = PropertyCalculator()
        
        # Calculate cashflow for each property
        for property_item in properties_response["properties"]:

            # Get property id
            property_id = property_item["property_id"]

            # Get property detail
            detail_response = await get_property_detail(property_id)
            
            # Calculate estimated gross rents
            gross_rents = await get_gross_rents(property_id)
            
            # Create api_data using create_property_api_data function
            api_data = create_property_api_data(
                detail_response=detail_response,
                gross_rents=gross_rents
            )
            
            # Calculate cashflow
            calculated_data = calculator.calculate_cashflow(api_data, user_inputs, property_id)
            
            # Combine data
            property_data = {
                **property_item,
                "cashflow_per_unit": calculated_data['Cashflow per Unit per Month'],
                "calculated_data": calculated_data,
                "api_data": api_data,
                "user_inputs": user_inputs
            }
            
            properties.append(property_data)

        return {"properties": properties}

    except Exception as e:
        logger.error(f"Error in search_property_cashflow: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/properties/search-cashflow-by-property-id")
async def search_property_cashflow_by_id(
    property_id: str,
    current_user: Optional[users.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
) -> Dict:
    try:
        logger.info(f"Searching properties with property_id: {property_id} (authenticated: {current_user is not None})")
        
        # Safely handle user_id
        try:
            user_id = current_user.id if current_user else None
        except:
            user_id = None
            logger.warning("Failed to get user ID, using None instead")
            
        # Add log for debugging
        logger.info(f"Using user_id: {user_id}")
        
        user_inputs = await get_default_user_inputs(user_id, db)
        
        # Get property detail
        detail_response = await get_property_detail(property_id)
        
        if not detail_response:
            logger.warning("No property details found")
            return {"properties": []}
            
        # Calculate estimated gross rents
        gross_rents = await get_gross_rents(property_id)

        # Create api_data using create_property_api_data function
        api_data = create_property_api_data(
            detail_response=detail_response,
            gross_rents=gross_rents
        )
        
        # Calculate cashflow
        calculator = PropertyCalculator()
        calculated_data = calculator.calculate_cashflow(api_data, user_inputs, property_id)
        
        property_data = {
            "property_id": property_id,
            "cashflow_per_unit": calculated_data['Cashflow per Unit per Month'],
            "calculated_data": calculated_data,
            "api_data": api_data,
            "user_inputs": user_inputs
        }
        
        return {"properties": [property_data]}

    except Exception as e:
        logger.error(f"Error in search_property_cashflow_by_id: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/properties/recalculate")
async def recalculate_property(
    request_data: dict,
    current_user: Optional[users.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
) -> Dict:
    try:
        logger.info(f"Recalculating property with data: {request_data}")
        
        # Extract data sent from client
        property_id = request_data.get("property_id")
        values = request_data.get("values", {})
        
        if not property_id:
            raise HTTPException(status_code=400, detail="Property ID is required")
        
        # Safely handle user_id
        try:
            user_id = current_user.id if current_user else None
        except:
            user_id = None
            logger.warning("Failed to get user ID, using None instead")
        
        # Create api_data object using data from frontend without external API call
        api_data = PropertyAPIData(
            # Property Info
            address=values.get("address", ""),
            fair_market_value=values.get("fair_market_value", 0),
            number_of_units=values.get("number_of_units", 1),
            
            # Purchase Info
            offer_price=values.get("offer_price", 0),
            transfer_tax=values.get("transfer_tax", 0),
            
            # Financing
            first_mtg_interest_rate=values.get("1st_mtg_interest_rate", 0),
            
            # Income
            gross_rents=values.get("gross_rents", 0),
            
            # Operating Expenses
            property_taxes=values.get("property_taxes", 0),
            insurance=values.get("insurance", 0),
            association_fees=values.get("association_fees", 0)
        )
        
        # Convert user input values (using values sent from frontend)
        user_inputs = {
            "vacancyRate": values.get("vacancy_rate", 0.05) * 100,  # frontend uses 0.05, API uses 5.0
            "managementRate": values.get("management_rate", 0.1) * 100,
            "advertisingCostPerVacancy": values.get("advertising_cost_per_vacancy", 100.0),
            "annualAppreciationRate": values.get("annual_appreciation_rate", 0.03) * 100,
            "repairs": values.get("repairs", 5000.0),
            "repairsContingency": values.get("repairs_contingency", 0.0),
            "lenderFee": values.get("lender_fee", 10000.0),
            "brokerFee": values.get("broker_fee", 500.0),
            "environmentals": values.get("environmentals", 0.0),
            "inspections": values.get("inspections", 1300.0),
            "appraisals": values.get("appraisals", 1000.0),
            "misc": values.get("misc", 500.0),
            "legal": values.get("legal", 4000.0),
            "firstMtgAmortizationPeriod": values.get("1st_mtg_amortization_period", 30),
            "firstMtgInterestRate": values.get("1st_mtg_interest_rate", 0.065) * 100,
            "firstMtgCMHCFee": values.get("1st_mtg_cmhc_fee", 0.0) * 100,
            "secondMtgPrinciple": values.get("2nd_mtg_principle_amount", 0.0),
            "secondMtgInterestRate": values.get("2nd_mtg_interest_rate", 0.12) * 100,
            "secondMtgAmortization": values.get("2nd_mtg_amortization_period", 9999),
            "interestOnlyPrinciple": values.get("interest_only_principle_amount", 0.0),
            "interestOnlyRate": values.get("interest_only_interest_rate", 0.0) * 100,
            "otherMonthlyFinancing": values.get("other_monthly_financing_costs", 0.0),
            "parking": values.get("parking", 0.0),
            "storage": values.get("storage", 0.0),
            "laundryVending": values.get("laundry___vending", 0.0),
            "otherIncome": values.get("other_income", 0.0),
            "repairsRate": values.get("repairs_rate", 5.0),
            "electricity": values.get("electricity", 0.0),
            "gas": values.get("gas", 0.0),
            "lawnMaintenance": values.get("lawn___snow_maintenance", 0.0),
            "waterSewer": values.get("water___sewer", 100.0),
            "cable": values.get("cable", 0.0),
            "caretaking": values.get("caretaking", 0.0),
            "trashRemoval": values.get("trash_removal", 0.0),
            "miscExpenses": values.get("miscellaneous", 0.0),
            "commonAreaMaintenance": values.get("common_area_maintenance", 0.0),
            "capitalImprovements": values.get("capital_improvements", 0.0),
            "accounting": values.get("accounting", 0.0),
            "legalExpenses": values.get("legal_expenses", 0.0),
            "badDebts": values.get("bad_debts", 0.0),
            "otherExpenses": values.get("other_expenses", 0.0),
            "depositWithOffer": values.get("deposit_s__made_with_offer", 0.0),
            "lessProRationOfRents": values.get("less_pro_ration_of_rents", 0.0),
        }
        
        # Calculate cashflow using PropertyCalculator
        calculator = PropertyCalculator()
        calculated_data = calculator.calculate_cashflow(api_data, user_inputs, property_id)
        
        # Construct response data (same format as search-cashflow-by-property-id API)
        property_data = {
            "property_id": property_id,
            "cashflow_per_unit": calculated_data['Cashflow per Unit per Month'],
            "calculated_data": calculated_data,
            "api_data": {
                "address": api_data.address,
                "fair_market_value": api_data.fair_market_value,
                "number_of_units": api_data.number_of_units,
                "offer_price": api_data.offer_price,
                "transfer_tax": api_data.transfer_tax,
                "first_mtg_interest_rate": api_data.first_mtg_interest_rate,
                "gross_rents": api_data.gross_rents,
                "property_taxes": api_data.property_taxes,
                "insurance": api_data.insurance,
                "association_fees": api_data.association_fees
            },
            "user_inputs": user_inputs
        }
        
        return {"properties": [property_data]}
        
    except Exception as e:
        logger.error(f"Error in recalculate_property: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# Add user authentication routes
@app.post("/api/signup", status_code=status.HTTP_201_CREATED)
async def signup(email: str, password: str, name: str, db: Session = Depends(get_db)):
    # Check for email duplication
    db_user = db.query(users.User).filter(users.User.email == email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash password
    hashed_password = get_password_hash(password)
    
    # Create new user
    new_user = users.User(
        email=email,
        password=hashed_password,
        username=name
    )
    
    # Save to DB
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {"message": "User created successfully"}

@app.post("/api/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    # Search user by email
    user = db.query(users.User).filter(users.User.email == form_data.username).first()
    
    # If user doesn't exist or password doesn't match
    if not user or not verify_password(form_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Generate JWT token
    access_token = create_access_token(data={"sub": user.email})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "email": user.email,
        "username": user.username
    }

# User data related APIs
@app.get("/api/user/profile")
async def get_user_profile(current_user: users.User = Depends(get_current_user)):
    """Returns profile information for the currently logged-in user."""
    return {
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "username": current_user.username,
            "created_at": current_user.created_at
        }
    }

# Add user profile update endpoint
@app.put("/api/user/profile")
async def update_user_profile(
    user_update: dict,
    current_user: users.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Updates user profile information."""
    try:
        # Update username
        if "username" in user_update and user_update["username"]:
            current_user.username = user_update["username"]
        
        # Handle password change
        if "new_password" in user_update and user_update["new_password"]:
            # Check current password
            if not "current_password" in user_update or not user_update["current_password"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Current password is required to change password"
                )
            
            # Verify current password
            if not verify_password(user_update["current_password"], current_user.password):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Current password is incorrect"
                )
            
            # Hash and save the new password
            current_user.password = get_password_hash(user_update["new_password"])
        
        # Save changes to DB
        db.commit()
        db.refresh(current_user)
        
        return {
            "message": "Profile updated successfully",
            "user": {
                "id": current_user.id,
                "email": current_user.email,
                "username": current_user.username,
                "created_at": current_user.created_at
            }
        }
    except HTTPException:
        # Pass through already defined HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error updating user profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update profile: {str(e)}"
        )

@app.get("/api/user/saved-properties")
async def get_user_saved_properties(
    current_user: users.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns a list of properties saved by the currently logged-in user."""
    # Query saved properties
    saved_properties = db.query(
        user_saved_properties.UserSavedProperty
    ).filter(
        user_saved_properties.UserSavedProperty.user_id == current_user.id
    ).all()
    
    # If no saved properties
    if not saved_properties:
        return {"properties": []}
    
    # Include property details
    property_list = []
    for saved in saved_properties:
        property_data = db.query(properties.Property).filter(
            properties.Property.id == saved.property_id
        ).first()
        
        if property_data:
            # Brief property information
            property_info = {
                "id": property_data.id,
                "property_id": property_data.property_id,
                "address": property_data.address,
                "city": property_data.city,
                "state": property_data.state,
                "postal_code": property_data.postal_code,
                "list_price": property_data.list_price,
                "bedrooms": property_data.bedrooms,
                "bathrooms": property_data.bathrooms,
                "square_feet": property_data.square_feet,
                "property_type": property_data.property_type,
                "lat": property_data.lat,
                "lon": property_data.lon,
                "saved_at": saved.created_at,
                "notes": saved.notes
            }
            
            property_list.append(property_info)
    
    return {"properties": property_list}

@app.get("/api/user/inputs")
async def get_user_inputs(
    current_user: users.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns the user's current input settings."""
    # Query user input values
    user_input = db.query(
        user_inputs.UserInput
    ).filter(
        user_inputs.UserInput.user_id == current_user.id
    ).first()
    
    # Use default values if inputs don't exist
    if not user_input:
        return {"user_inputs": get_default_user_inputs()}
    
    return {"user_inputs": {
        "id": user_input.id,
        "vacancy_rate": user_input.vacancy_rate,
        "management_rate": user_input.management_rate,
        "advertising_cost_per_vacancy": user_input.advertising_cost_per_vacancy,
        "repairs": user_input.repairs,
        "repairs_contingency": user_input.repairs_contingency,
        "lender_fee": user_input.lender_fee,
        "broker_fee": user_input.broker_fee,
        "environmentals": user_input.environmentals,
        "inspections": user_input.inspections,
        "appraisals": user_input.appraisals,
        "misc": user_input.misc,
        "legal": user_input.legal,
        "mtg_amortization_period": user_input.mtg_amortization_period,
        "first_mtg_interest_rate": user_input.first_mtg_interest_rate,
        "first_mtg_amortization_period": user_input.first_mtg_amortization_period,
        "first_mtg_cmhc_fee": user_input.first_mtg_cmhc_fee,
        "second_mtg_principle": user_input.second_mtg_principle,
        "second_mtg_interest_rate": user_input.second_mtg_interest_rate,
        "second_mtg_amortization": user_input.second_mtg_amortization,
        "interest_only_principle": user_input.interest_only_principle,
        "interest_only_rate": user_input.interest_only_rate,
        "other_monthly_financing": user_input.other_monthly_financing
    }}

@app.post("/api/user/inputs")
async def update_user_inputs(
    inputs: dict,
    current_user: users.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Updates the user's input values."""
    # Query existing input values
    user_input = db.query(
        user_inputs.UserInput
    ).filter(
        user_inputs.UserInput.user_id == current_user.id
    ).first()
    
    # Create new if inputs don't exist
    if not user_input:
        user_input = user_inputs.UserInput(
            user_id=current_user.id,
            name=f"{current_user.username}'s Inputs"
        )
        db.add(user_input)
    
    # Update fields
    for key, value in inputs.items():
        if hasattr(user_input, key):
            setattr(user_input, key, value)
    
    db.commit()
    db.refresh(user_input)
    
    return {"message": "User inputs updated successfully", "user_inputs": user_input}

@app.post("/api/user/saved-properties/{property_id}")
async def save_property(
    property_id: str,
    notes: str = None,
    current_user: users.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Adds a property to the user's saved list."""
    # Check property information
    property_data = db.query(
        properties.Property
    ).filter(
        properties.Property.property_id == property_id
    ).first()
    
    # If property doesn't exist, get info from API and save
    if not property_data:
        try:
            # Get property details
            property_detail = await get_property_detail(property_id)
            
            # Create new property information
            property_data = properties.Property(
                property_id=property_id,
                address=property_detail.get("address", {}).get("line", ""),
                city=property_detail.get("address", {}).get("city", ""),
                state=property_detail.get("address", {}).get("state_code", ""),
                postal_code=property_detail.get("address", {}).get("postal_code", ""),
                list_price=property_detail.get("list_price", 0),
                bedrooms=property_detail.get("description", {}).get("beds", 0),
                bathrooms=property_detail.get("description", {}).get("baths", 0),
                square_feet=property_detail.get("description", {}).get("sqft", 0),
                property_type=property_detail.get("description", {}).get("type", ""),
                lat=property_detail.get("location", {}).get("address", {}).get("coordinate", {}).get("lat", 0),
                lon=property_detail.get("location", {}).get("address", {}).get("coordinate", {}).get("lon", 0)
            )
            
            db.add(property_data)
            db.commit()
            db.refresh(property_data)
        except Exception as e:
            logger.error(f"Error fetching property details: {str(e)}")
            raise HTTPException(status_code=404, detail="Property not found")
    
    # Check if property is already saved
    saved = db.query(
        user_saved_properties.UserSavedProperty
    ).filter(
        user_saved_properties.UserSavedProperty.user_id == current_user.id,
        user_saved_properties.UserSavedProperty.property_id == property_data.id
    ).first()
    
    if saved:
        # If already saved, update notes only
        if notes:
            saved.notes = notes
            db.commit()
        return {"message": "Property already saved", "saved_property_id": saved.id}
    
    # Save new property
    new_saved = user_saved_properties.UserSavedProperty(
        user_id=current_user.id,
        property_id=property_data.id,
        notes=notes
    )
    
    db.add(new_saved)
    db.commit()
    db.refresh(new_saved)
    
    return {"message": "Property saved successfully", "saved_property_id": new_saved.id}

@app.delete("/api/user/saved-properties/{property_id}")
async def remove_saved_property(
    property_id: str,
    current_user: users.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Removes a saved property from the user's saved list."""
    # Find property ID
    property_data = db.query(
        properties.Property
    ).filter(
        properties.Property.property_id == property_id
    ).first()
    
    if not property_data:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Find saved property record
    saved = db.query(
        user_saved_properties.UserSavedProperty
    ).filter(
        user_saved_properties.UserSavedProperty.user_id == current_user.id,
        user_saved_properties.UserSavedProperty.property_id == property_data.id
    ).first()
    
    if not saved:
        raise HTTPException(status_code=404, detail="Saved property not found")
    
    # Delete
    db.delete(saved)
    db.commit()
    
    return {"message": "Property removed from saved list"}
