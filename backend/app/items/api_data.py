from pydantic import BaseModel, Field
from decimal import Decimal
from typing import Optional, Dict

class PropertyAPIData(BaseModel):
    # Property Info
    address: Optional[str] = None
    fair_market_value: Optional[float] = None
    number_of_units: Optional[int] = None
    
    # Purchase Info
    offer_price: Optional[float] = None
    transfer_tax: Optional[float] = None
    
    # Financing
    first_mtg_interest_rate: Optional[float] = None
    
    # Income
    gross_rents: Optional[float] = None
    
    # Operating Expenses
    property_taxes: Optional[float] = None
    insurance: Optional[float] = None
    association_fees: Optional[float] = None

    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }

    def get(self, key, default=None):
        """A dict-like method to safely access attributes"""
        try:
            return getattr(self, key)
        except AttributeError:
            return default

def create_property_api_data(detail_response: Dict, gross_rents: float) -> PropertyAPIData:
    """
    Convert API response and gross_rents into a PropertyAPIData object
    
    Args:
        detail_response (Dict): Property detail API response
        gross_rents (float): Estimated rental income
        
    Returns:
        PropertyAPIData: Converted data object
    """
    try:
        home_data = detail_response.get('data', {}).get('home', {})
        location = home_data.get('location', {})
        address = location.get('address', {})
        mortgage = home_data.get('mortgage', {})
        description = home_data.get('description', {})
        
        # Create address string
        address_str = f"{address.get('line', '')}, {address.get('city', '')}, {address.get('state_code', '')} {address.get('postal_code', '')}"
        
        return PropertyAPIData(
            # Property Info
            address=address_str,
            fair_market_value=home_data.get('list_price'),
            number_of_units=description.get('units', 1),
            
            # Purchase Info
            offer_price=home_data.get('list_price'),
            transfer_tax=None,  # Not provided in API
            
            # Financing
            first_mtg_interest_rate=mortgage.get('estimate', {}).get('average_rate', {}).get('rate'),
            
            # Income
            gross_rents=gross_rents,
            
            # Operating Expenses
            property_taxes=(mortgage.get('property_tax_rate', 0) * home_data.get('list_price', 0)) if home_data.get('list_price') else None,
            insurance=(mortgage.get('insurance_rate', 0) * home_data.get('list_price', 0)) if home_data.get('list_price') else None,
            association_fees=home_data.get('hoa', {}).get('fee')
        )
    except Exception as e:
        print(f"Error creating PropertyAPIData: {str(e)}")
        return PropertyAPIData()

# Usage example:
"""
# Create PropertyAPIData object from API response
api_data = create_property_api_data(
    detail_response=detail_response,
    gross_rents=gross_rents
)
"""