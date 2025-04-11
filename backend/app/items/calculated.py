from typing import Dict, Union, Any
import logging
import sys
from decimal import Decimal
from .api_data import PropertyAPIData
import math

# Configure logging (removed file handler completely)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class PropertyCalculator:
    def __init__(self):
        # Use existing logger inside class
        self.logger = logger  # Modified: Use global logger instead of creating new one

    def _get_default_calculation_result(self) -> Dict:
        """Returns a default calculation result with all values set to None"""
        return {
            'Real Purchase Price': None,
            'First Mortgage Principle Borrowed': None,
            'First Mortgage Total Principle': None,
            'First Mortgage Total Monthly Payment': None,
            'Second Mortgage Total Monthly Payment': None,
            'Interest Only Total Monthly Payment': None,
            'Cash Required to Close After Financing': None,
            'Total Income': None,
            'Vacancy Loss Percentage': None,
            'Effective Gross Income': None,
            'Repairs Cost': None,
            'Management': None,
            'Advertising': None,
            'Pest Control': None,
            'Security': None,
            'Evictions': None,
            'Total Expenses': None,
            'Net Operating Income': None,
            'Cash Required to Close': None,
            'Total Cash Required': None,
            'Debt Servicing Costs': None,
            'Annual Profit or Loss': None,
            'Total Monthly Profit or Loss': None,
            'Cashflow per Unit per Month': None,
            'First Mortgage LTV': None,
            'First Mortgage LTPP': None,
            'Second Mortgage LTV': None,
            'Second Mortgage LTPP': None,
            'Cap Rate on PP': None,
            'Cap Rate on FMV': None,
            'Average Rent': None,
            'GRM': None,
            'DCR': None,
            'Cash on Cash ROI': None,
            'Equity ROI after 1 Year': None,
            'Appreciation ROI after 1 Year': None,
            'Total ROI after 1 Year': None,
            'Forced App ROI after 1 Year': None,
            'Expense to Income Ratio': None
        }

    def calculate_cashflow(self, api_data: PropertyAPIData, user_inputs: Dict, property_id=None) -> Dict:
        """
        property_id가 None인 경우에도 안전하게 처리
        """
        try:
            if property_id is None:
                property_id = "unknown"
            
            self.logger.info("Starting cashflow calculation...")
            self.logger.info(f"User inputs: {user_inputs}")
            
            # Extract property details from PropertyAPIData
            offer_price = api_data.offer_price or 0
            fair_market_value = api_data.fair_market_value or offer_price
            number_of_units = api_data.number_of_units or 1
            gross_rents = api_data.gross_rents or 0
            property_taxes = api_data.property_taxes or 0
            insurance_rate = api_data.insurance / offer_price if api_data.insurance and offer_price else 0

            self.logger.info(f"Offer Price: {offer_price}")
            self.logger.info(f"Fair Market Value: {fair_market_value}")
            self.logger.info(f"Number of Units: {number_of_units}")
            self.logger.info(f"Gross Rents: {gross_rents}")
            self.logger.info(f"Property Taxes: {property_taxes}")
            self.logger.info(f"Insurance Rate: {insurance_rate}")

            # Purchase Info
            self.logger.info("Calculating Purchase Info...")
            real_purchase_price = (
                offer_price + 
                user_inputs.get('repairs', 0) + 
                user_inputs.get('repairsContingency', 0) + 
                user_inputs.get('lenderFee', 0) + 
                user_inputs.get('brokerFee', 0) + 
                user_inputs.get('environmentals', 0) + 
                user_inputs.get('inspections', 0) + 
                user_inputs.get('appraisals', 0) + 
                user_inputs.get('misc', 0) + 
                user_inputs.get('legal', 0)
            )
            self.logger.info(f"Real Purchase Price: {real_purchase_price}")
            
            # Financing (Monthly)
            self.logger.info("Calculating Financing...")
            first_mortgage_principle_borrowed = offer_price * 0.8
            first_mortgage_total_principle = first_mortgage_principle_borrowed * (1 + user_inputs.get('firstMtgCMHCFee', 0) / 100)
            
            # Calculate monthly payment using the formula: P * (r(1+r)^n) / ((1+r)^n - 1)
            first_mortgage_interest_rate = user_inputs.get('firstMtgInterestRate', 0) / 100 / 12
            first_mortgage_periods = user_inputs.get('firstMtgAmortizationPeriod', 30) * 12
            
            # Prevent division by zero
            if first_mortgage_interest_rate == 0 or first_mortgage_periods == 0:
                first_mortgage_total_monthly_payment = first_mortgage_total_principle / first_mortgage_periods if first_mortgage_periods > 0 else 0
            else:
                first_mortgage_total_monthly_payment = (
                    first_mortgage_total_principle * 
                    (first_mortgage_interest_rate * (1 + first_mortgage_interest_rate)**first_mortgage_periods) / 
                    ((1 + first_mortgage_interest_rate)**first_mortgage_periods - 1)
                )
            
            second_mortgage_interest_rate = user_inputs.get('secondMtgInterestRate', 0) / 100 / 12
            second_mortgage_periods = min(user_inputs.get('secondMtgAmortization', 0) * 12, 360)  # Limited to maximum 30 years
            second_mortgage_principle = user_inputs.get('secondMtgPrinciple', 0)
            
            # Prevent division by zero
            if second_mortgage_interest_rate == 0 or second_mortgage_periods == 0:
                second_mortgage_total_monthly_payment = second_mortgage_principle / second_mortgage_periods if second_mortgage_periods > 0 else 0
            else:
                second_mortgage_total_monthly_payment = (
                    second_mortgage_principle * 
                    (second_mortgage_interest_rate * (1 + second_mortgage_interest_rate)**second_mortgage_periods) / 
                    ((1 + second_mortgage_interest_rate)**second_mortgage_periods - 1)
                ) if second_mortgage_periods > 0 else 0
            
            interest_only_total_monthly_payment = (
                user_inputs.get('interestOnlyPrinciple', 0) * 
                user_inputs.get('interestOnlyRate', 0) / 100 / 12
            )
            
            cash_required_to_close_after_financing = (
                real_purchase_price - 
                first_mortgage_principle_borrowed - 
                second_mortgage_principle - 
                user_inputs.get('interestOnlyPrinciple', 0)
            )
            
            # Income (Annual)
            self.logger.info("Calculating Annual Income...")
            total_income = (
                gross_rents + 
                user_inputs.get('parkingIncome', 0) + 
                user_inputs.get('storageIncome', 0) + 
                user_inputs.get('laundryVendingIncome', 0) + 
                user_inputs.get('otherIncome', 0)
            )
            
            vacancy_loss_percentage = user_inputs.get('vacancyRate', 0) / 100 * total_income
            effective_gross_income = total_income - vacancy_loss_percentage
            
            # Operating Expenses (Annual)
            self.logger.info("Calculating Operating Expenses...")
            repairs_cost = gross_rents * user_inputs.get('repairsRate', 0) / 100
            management = user_inputs.get('managementRate', 0) / 100 * total_income
            advertising = number_of_units * 12 * user_inputs.get('vacancyRate', 0) / 100 / 2 * user_inputs.get('advertisingCostPerVacancy', 0)
            pest_control = 140 * number_of_units if number_of_units < 2 else 70 * number_of_units
            security = number_of_units * 12 * user_inputs.get('vacancyRate', 0) / 100 / 1.5 * 50
            evictions = number_of_units * 12 * user_inputs.get('vacancyRate', 0) / 100 / 2 / 10 * 1000
            
            total_expenses = (
                property_taxes + 
                (offer_price * insurance_rate) + 
                repairs_cost + 
                user_inputs.get('electricity', 0) + 
                user_inputs.get('gas', 0) + 
                user_inputs.get('lawnMaintenance', 0) + 
                user_inputs.get('waterSewer', 0) + 
                user_inputs.get('cable', 0) + 
                management + 
                user_inputs.get('caretaking', 0) + 
                advertising + 
                user_inputs.get('hoaFees', 0) + 
                pest_control + 
                security + 
                user_inputs.get('trashRemoval', 0) + 
                user_inputs.get('miscExpenses', 0) + 
                evictions
            )
            
            # Net Operating Income (Annual)
            self.logger.info("Calculating Net Operating Income...")
            net_operating_income = effective_gross_income - total_expenses
            
            # Cash Requirements
            self.logger.info("Calculating Cash Requirements...")
            cash_required_to_close = cash_required_to_close_after_financing - user_inputs.get('deposit', 0)
            total_cash_required = cash_required_to_close + user_inputs.get('deposit', 0) - user_inputs.get('proRationOfRents', 0)
            
            # Cashflow Summary (Annual)
            self.logger.info("Calculating Cashflow Summary...")
            debt_servicing_costs = (
                first_mortgage_total_monthly_payment + 
                second_mortgage_total_monthly_payment + 
                interest_only_total_monthly_payment + 
                user_inputs.get('otherMonthlyFinancing', 0)
            ) * 12
            
            annual_profit_or_loss = net_operating_income - debt_servicing_costs
            total_monthly_profit_or_loss = annual_profit_or_loss / 12
            cashflow_per_unit_per_month = total_monthly_profit_or_loss / number_of_units
            
            # Quick Analysis
            self.logger.info("Calculating Quick Analysis Metrics...")
            first_mortgage_ltv = first_mortgage_principle_borrowed / fair_market_value if fair_market_value > 0 else 0
            first_mortgage_ltpp = first_mortgage_principle_borrowed / offer_price if offer_price > 0 else 0
            second_mortgage_ltv = second_mortgage_principle / fair_market_value if fair_market_value > 0 else 0
            second_mortgage_ltpp = second_mortgage_principle / offer_price if offer_price > 0 else 0
            cap_rate_on_pp = net_operating_income / offer_price if offer_price > 0 else 0
            cap_rate_on_fmv = net_operating_income / fair_market_value if fair_market_value > 0 else 0
            average_rent = gross_rents / number_of_units / 12 if number_of_units > 0 else 0
            grm = offer_price / gross_rents if gross_rents > 0 else 0
            dcr = "No Debt to Cover" if -debt_servicing_costs <= 0 else (
                "Unknown" if debt_servicing_costs == 0 else 
                net_operating_income / -debt_servicing_costs
            )
            cash_on_cash_roi = "Infinite" if total_cash_required <= 0 else annual_profit_or_loss / total_cash_required
            
            # Calculate equity ROI after 1 year
            if first_mortgage_periods > 0 and first_mortgage_interest_rate > 0:
                denominator = (1 + first_mortgage_interest_rate)**first_mortgage_periods - 1
                if denominator != 0:
                    first_mortgage_ending_balance = first_mortgage_total_principle * (
                        (1 + first_mortgage_interest_rate)**first_mortgage_periods - 
                        (1 + first_mortgage_interest_rate)**(first_mortgage_periods - 12)
                    ) / denominator
                else:
                    first_mortgage_ending_balance = 0
            else:
                first_mortgage_ending_balance = 0
            
            if second_mortgage_periods > 0 and second_mortgage_interest_rate > 0:
                denominator = (1 + second_mortgage_interest_rate)**second_mortgage_periods - 1
                if denominator != 0:
                    second_mortgage_ending_balance = second_mortgage_principle * (
                        (1 + second_mortgage_interest_rate)**second_mortgage_periods - 
                        (1 + second_mortgage_interest_rate)**(second_mortgage_periods - 12)
                    ) / denominator
                else:
                    second_mortgage_ending_balance = 0
            else:
                second_mortgage_ending_balance = 0
            
            equity_roi_after_1_year = "Infinite" if total_cash_required <= 0 else (
                (first_mortgage_principle_borrowed - first_mortgage_ending_balance + 
                 second_mortgage_principle - second_mortgage_ending_balance) / 
                total_cash_required
            )
            
            appreciation_roi_after_1_year = "Infinite" if total_cash_required <= 0 else (
                (fair_market_value * (1 + user_inputs.get('annualAppreciationRate', 0) / 100) - fair_market_value) / 
                abs(total_cash_required)
            )
            
            total_roi_after_1_year = "Infinite" if total_cash_required <= 0 else (
                cash_on_cash_roi + equity_roi_after_1_year + appreciation_roi_after_1_year
            )
            
            forced_app_roi_after_1_year = "Infinite" if total_cash_required <= 0 else (
                (fair_market_value - real_purchase_price) / abs(total_cash_required)
            )
            
            expense_to_income_ratio = total_expenses / total_income if total_income > 0 else 0

            self.logger.info("Calculation completed successfully")

            return {
                # Purchase Info
                'Real Purchase Price': real_purchase_price,  # RPP
                
                # Financing (Monthly)
                'First Mortgage Principle Borrowed': first_mortgage_principle_borrowed,
                'First Mortgage Total Principle': first_mortgage_total_principle,  # Incl. CMHC Fees
                'First Mortgage Total Monthly Payment': first_mortgage_total_monthly_payment,
                'Second Mortgage Total Monthly Payment': second_mortgage_total_monthly_payment,
                'Interest Only Total Monthly Payment': interest_only_total_monthly_payment,
                'Cash Required to Close After Financing': cash_required_to_close_after_financing,
                
                # Income (Annual)
                'Total Income': total_income,
                'Vacancy Loss Percentage': vacancy_loss_percentage,  # % of Total Income
                'Effective Gross Income': effective_gross_income,
                
                # Operating Expenses (Annual)
                'Repairs Cost': repairs_cost,
                'Management': management,
                'Advertising': advertising,
                'Pest Control': pest_control,
                'Security': security,
                'Evictions': evictions,
                'Total Expenses': total_expenses,
                
                # Net Operating Income (Annual)
                'Net Operating Income': net_operating_income,
                
                # Cash Requirements
                'Cash Required to Close': cash_required_to_close,
                'Total Cash Required': total_cash_required,
                
                # Cashflow Summary (Annual)
                'Effective Gross Income': effective_gross_income,
                'Operating Expenses': total_expenses,
                'Net Operating Income': net_operating_income,
                'Debt Servicing Costs': debt_servicing_costs,
                'Annual Profit or Loss': annual_profit_or_loss,
                'Total Monthly Profit or Loss': total_monthly_profit_or_loss,
                'Cashflow per Unit per Month': cashflow_per_unit_per_month,
                
                # Quick Analysis
                'First Mortgage LTV': first_mortgage_ltv,
                'First Mortgage LTPP': first_mortgage_ltpp,
                'Second Mortgage LTV': second_mortgage_ltv,
                'Second Mortgage LTPP': second_mortgage_ltpp,
                'Cap Rate on PP': cap_rate_on_pp,
                'Cap Rate on FMV': cap_rate_on_fmv,
                'Average Rent': average_rent,
                'GRM': grm,
                'DCR': dcr,
                'Cash on Cash ROI': cash_on_cash_roi,
                'Equity ROI after 1 Year': equity_roi_after_1_year,
                'Appreciation ROI after 1 Year': appreciation_roi_after_1_year,
                'Total ROI after 1 Year': total_roi_after_1_year,
                'Forced App ROI after 1 Year': forced_app_roi_after_1_year,
                'Expense to Income Ratio': expense_to_income_ratio
            }
        except Exception as e:
            self.logger.error(f"Error calculating cashflow: {str(e)}")
            return {"Cashflow per Unit per Month": 0}