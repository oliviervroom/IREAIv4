from typing import Dict, Optional
from pydantic import BaseModel, Field
from decimal import Decimal
from sqlalchemy.orm import Session
from fastapi import Depends
from ..database import get_db
from ..models import UserInput  # Changed from UserInputsDB to UserInput
import logging

# Configure logging
logger = logging.getLogger(__name__)

# Define default values as constants
DEFAULT_USER_INPUTS = {
    "vacancy_rate": 0.05,
    "management_rate": 0.10,
    "advertising_cost_per_vacancy": 100.0,
    "annual_appreciation_rate": 0.03,
    "repairs": 5000.0,
    "repairs_contingency": 0.0,
    "lender_fee": 10000.0,
    "broker_fee": 500.0,
    "environmentals": 0.0,
    "inspections": 1300.0,
    "appraisals": 1000.0,
    "misc": 500.0,
    "legal": 4000.0,
    "first_mtg_amortization_period": 30,
    "first_mtg_interest_rate": 6.5,
    "first_mtg_cmhc_fee": 0.0,
    "second_mtg_principle": 0.0,
    "second_mtg_interest_rate": 12.0,
    "second_mtg_amortization": 9999,
    "interest_only_principle": 0.0,
    "interest_only_rate": 0.0,
    "other_monthly_financing": 0.0,
    "parking": 0.0,
    "storage": 0.0,
    "laundry_vending": 0.0,
    "other_income": 0.0,
    "gross_rents": 0.0,
    "repairs_rate": 5.0,
    "electricity": 0.0,
    "gas": 0.0,
    "lawn_maintenance": 0.0,
    "water_sewer": 100.0,
    "cable": 0.0,
    "caretaking": 0.0,
    "trash_removal": 0.0,
    "miscellaneous": 0.0,
    "common_area_maintenance": 0.0,
    "capital_improvements": 0.0,
    "accounting": 0.0,
    "legal_expenses": 0.0,
    "bad_debts": 0.0,
    "other_expenses": 0.0,
    "deposit_with_offer": 0.0,
    "less_pro_ration_of_rents": 0.0
}

class UserInputs(BaseModel):
    # Property Info
    vacancyRate: float = Field(DEFAULT_USER_INPUTS["vacancy_rate"], description="Property vacancy rate (%)")
    managementRate: float = Field(DEFAULT_USER_INPUTS["management_rate"], description="Management fee rate (%)")
    advertisingCostPerVacancy: float = Field(DEFAULT_USER_INPUTS["advertising_cost_per_vacancy"], description="Advertising cost per vacancy")
    annualAppreciationRate: float = Field(DEFAULT_USER_INPUTS["annual_appreciation_rate"], description="Annual appreciation rate (%)")
    
    # Purchase Info
    repairs: float = Field(DEFAULT_USER_INPUTS["repairs"], description="Repair costs")
    repairsContingency: float = Field(DEFAULT_USER_INPUTS["repairs_contingency"], description="Repair contingency")
    lenderFee: float = Field(DEFAULT_USER_INPUTS["lender_fee"], description="Lender fee")
    brokerFee: float = Field(DEFAULT_USER_INPUTS["broker_fee"], description="Broker fee")
    environmentals: float = Field(DEFAULT_USER_INPUTS["environmentals"], description="Environmental costs")
    inspections: float = Field(DEFAULT_USER_INPUTS["inspections"], description="Inspection costs")
    appraisals: float = Field(DEFAULT_USER_INPUTS["appraisals"], description="Appraisal costs")
    misc: float = Field(DEFAULT_USER_INPUTS["misc"], description="Miscellaneous costs")
    legal: float = Field(DEFAULT_USER_INPUTS["legal"], description="Legal costs")
    
    # Financing
    firstMtgAmortizationPeriod: int = Field(DEFAULT_USER_INPUTS["first_mtg_amortization_period"], description="First mortgage amortization period (years)")
    firstMtgInterestRate: float = Field(DEFAULT_USER_INPUTS["first_mtg_interest_rate"], description="First mortgage interest rate (%)")
    firstMtgCMHCFee: float = Field(DEFAULT_USER_INPUTS["first_mtg_cmhc_fee"], description="First mortgage CMHC fee")
    secondMtgPrinciple: float = Field(DEFAULT_USER_INPUTS["second_mtg_principle"], description="Second mortgage principal")
    secondMtgInterestRate: float = Field(DEFAULT_USER_INPUTS["second_mtg_interest_rate"], description="Second mortgage interest rate (%)")
    secondMtgAmortization: int = Field(DEFAULT_USER_INPUTS["second_mtg_amortization"], description="Second mortgage amortization period (years)")
    interestOnlyPrinciple: float = Field(DEFAULT_USER_INPUTS["interest_only_principle"], description="Interest-only loan principal")
    interestOnlyRate: float = Field(DEFAULT_USER_INPUTS["interest_only_rate"], description="Interest-only loan rate (%)")
    otherMonthlyFinancing: float = Field(DEFAULT_USER_INPUTS["other_monthly_financing"], description="Other monthly financing costs")
    
    # Income
    parking: float = Field(DEFAULT_USER_INPUTS["parking"], description="Parking income")
    storage: float = Field(DEFAULT_USER_INPUTS["storage"], description="Storage income")
    laundryVending: float = Field(DEFAULT_USER_INPUTS["laundry_vending"], description="Laundry and vending income")
    otherIncome: float = Field(DEFAULT_USER_INPUTS["other_income"], description="Other income")
    grossRents: float = Field(DEFAULT_USER_INPUTS["gross_rents"], description="Gross rental income")
    
    # Operating Expenses
    repairsRate: float = Field(DEFAULT_USER_INPUTS["repairs_rate"], description="Repairs rate (%)")
    electricity: float = Field(DEFAULT_USER_INPUTS["electricity"], description="Electricity costs")
    gas: float = Field(DEFAULT_USER_INPUTS["gas"], description="Gas costs")
    lawnMaintenance: float = Field(DEFAULT_USER_INPUTS["lawn_maintenance"], description="Lawn maintenance costs")
    waterSewer: float = Field(DEFAULT_USER_INPUTS["water_sewer"], description="Water and sewer costs")
    cable: float = Field(DEFAULT_USER_INPUTS["cable"], description="Cable costs")
    caretaking: float = Field(DEFAULT_USER_INPUTS["caretaking"], description="Caretaking costs")
    trashRemoval: float = Field(DEFAULT_USER_INPUTS["trash_removal"], description="Trash removal costs")
    miscellaneous: float = Field(DEFAULT_USER_INPUTS["miscellaneous"], description="Miscellaneous expenses")
    commonAreaMaintenance: float = Field(DEFAULT_USER_INPUTS["common_area_maintenance"], description="Common area maintenance")
    capitalImprovements: float = Field(DEFAULT_USER_INPUTS["capital_improvements"], description="Capital improvements")
    accounting: float = Field(DEFAULT_USER_INPUTS["accounting"], description="Accounting costs")
    legalExpenses: float = Field(DEFAULT_USER_INPUTS["legal_expenses"], description="Legal expenses")
    badDebts: float = Field(DEFAULT_USER_INPUTS["bad_debts"], description="Bad debts")
    otherExpenses: float = Field(DEFAULT_USER_INPUTS["other_expenses"], description="Other expenses")
    
    # Cash Requirements
    depositWithOffer: float = Field(DEFAULT_USER_INPUTS["deposit_with_offer"], description="Deposit made with offer")
    lessProRationOfRents: float = Field(DEFAULT_USER_INPUTS["less_pro_ration_of_rents"], description="Less pro-ration of rents")
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }

async def get_default_user_inputs(user_id=None, db=None):
    """
    Returns user input values or default values
    user_id가 None이면 기본값 반환
    """
    try:
        logger.info(f"Getting user inputs for user_id: {user_id}")
        
        # Only query DB if both DB and user_id are available
        if user_id is not None and db is not None:
            logger.info("Querying user inputs from database")
            user_input = db.query(
                UserInput
            ).filter(
                UserInput.user_id == user_id
            ).first()
            
            if user_input:
                logger.info("Found user inputs in database")
                return {
                    "vacancy_rate": user_input.vacancy_rate,
                    "management_rate": user_input.management_rate,
                    "advertising_cost_per_vacancy": user_input.advertising_cost_per_vacancy,
                    "annual_appreciation_rate": user_input.annual_appreciation_rate,
                    "repairs": user_input.repairs,
                    "repairs_contingency": user_input.repairs_contingency,
                    "lender_fee": user_input.lender_fee,
                    "broker_fee": user_input.broker_fee,
                    "environmentals": user_input.environmentals,
                    "inspections": user_input.inspections,
                    "appraisals": user_input.appraisals,
                    "misc": user_input.misc,
                    "legal": user_input.legal,
                    "first_mtg_amortization_period": user_input.first_mtg_amortization_period,
                    "first_mtg_interest_rate": user_input.first_mtg_interest_rate,
                    "first_mtg_cmhc_fee": user_input.first_mtg_cmhc_fee,
                    "second_mtg_principle": user_input.second_mtg_principle,
                    "second_mtg_interest_rate": user_input.second_mtg_interest_rate,
                    "second_mtg_amortization": user_input.second_mtg_amortization,
                    "interest_only_principle": user_input.interest_only_principle,
                    "interest_only_rate": user_input.interest_only_rate,
                    "other_monthly_financing": user_input.other_monthly_financing,
                    "parking": user_input.parking,
                    "storage": user_input.storage,
                    "laundry_vending": user_input.laundry_vending,
                    "other_income": user_input.other_income,
                    "gross_rents": user_input.gross_rents,
                    "repairs_rate": user_input.repairs_rate,
                    "electricity": user_input.electricity,
                    "gas": user_input.gas,
                    "lawn_maintenance": user_input.lawn_maintenance,
                    "water_sewer": user_input.water_sewer,
                    "cable": user_input.cable,
                    "caretaking": user_input.caretaking,
                    "trash_removal": user_input.trash_removal,
                    "miscellaneous": user_input.miscellaneous,
                    "common_area_maintenance": user_input.common_area_maintenance,
                    "capital_improvements": user_input.capital_improvements,
                    "accounting": user_input.accounting,
                    "legal_expenses": user_input.legal_expenses,
                    "bad_debts": user_input.bad_debts,
                    "other_expenses": user_input.other_expenses,
                    "deposit_with_offer": user_input.deposit_with_offer,
                    "less_pro_ration_of_rents": user_input.less_pro_ration_of_rents
                }
        
        # Return default values
        logger.info("Using default user inputs")
        return DEFAULT_USER_INPUTS
        
    except Exception as e:
        logger.error(f"Error in get_user_inputs: {str(e)}")
        # Return same default values in case of error
        return DEFAULT_USER_INPUTS 