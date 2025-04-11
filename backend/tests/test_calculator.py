# tests/test_calculator.py
import pytest
from decimal import Decimal
from app.items.calculated import PropertyCalculator

class TestPropertyCalculator:
    """Property calculator test class"""
    
    @pytest.fixture
    def calculator(self):
        return PropertyCalculator()
    
    @pytest.fixture
    def property_detail(self):
        """Test property details"""
        return {
            "data": {
                "home": {
                    "list_price": 500000,
                    "description": {
                        "units": 2,
                        "beds": 3,
                        "baths": 2,
                        "sqft": 1500
                    },
                    "tax_history": [{"tax": 5000}],
                    "hoa": {"fee": 200}
                }
            }
        }
    
    @pytest.fixture
    def user_inputs(self):
        """Test user inputs"""
        return {
            "vacancyRate": 5,
            "managementRate": 10,
            "advertisingCostPerVacancy": 100,
            "grossRents": 4000,
            "repairsRate": 5,
            "electricity": 1000,
            "waterSewer": 100,
            "insurance": 2000,
            "firstMtgInterestRate": 6.5,
            "mtgAmortizationPeriod": 30,
            "annualAppreciationRate": 2
        }
    
    def test_calculate_total_income(self, calculator, property_detail, user_inputs):
        """Test total income calculation"""
        total_income = calculator.calculate_total_income(property_detail, user_inputs)
        expected = (user_inputs["grossRents"] + 
                    user_inputs.get("parkingIncome", 0) + 
                    user_inputs.get("storageIncome", 0) + 
                    user_inputs.get("laundryVendingIncome", 0) + 
                    user_inputs.get("otherIncome", 0)) * 12
        
        assert total_income == expected
    
    def test_calculate_vacancy_loss(self, calculator, user_inputs):
        """Test vacancy loss calculation"""
        total_income = 48000  # $4,000 * 12
        vacancy_loss = calculator.calculate_vacancy_loss(total_income, user_inputs)
        expected = (user_inputs["vacancyRate"] / 100) * total_income
        
        assert vacancy_loss == expected
    
    def test_calculate_effective_gross_income(self, calculator):
        """Test effective gross income calculation"""
        total_income = 48000
        vacancy_loss = 2400
        egi = calculator.calculate_effective_gross_income(total_income, vacancy_loss)
        
        assert egi == total_income - vacancy_loss
    
    def test_calculate_mortgage_payment(self, calculator):
        """Test mortgage payment calculation"""
        principle = 400000  # $400,000 loan
        interest_rate = 6.5  # 6.5% interest rate
        amortization_years = 30  # 30-year amortization period
        
        payment = calculator.calculate_mortgage_payment(principle, interest_rate, amortization_years)
        
        # Approximate verification of monthly payment (exact calculation is complex, so check approximate value)
        assert 2500 < payment < 2700
    
    def test_calculate_cashflow(self, calculator, property_detail, user_inputs):
        """Test comprehensive cashflow calculation"""
        results = calculator.calculate_cashflow(property_detail, user_inputs)
        
        # Check for essential fields
        assert "Effective Gross Income" in results
        assert "Operating Expenses" in results
        assert "Net Operating Income" in results
        assert "Debt Servicing Costs" in results
        assert "Annual Profit or Loss" in results
        assert "Total Monthly Profit or Loss" in results
        assert "Cashflow per Unit per Month" in results
        
        # Check logical relationships between values
        assert results["Net Operating Income"] == results["Effective Gross Income"] - results["Operating Expenses"]
        assert results["Annual Profit or Loss"] == results["Net Operating Income"] - results["Debt Servicing Costs"]
        assert abs(results["Total Monthly Profit or Loss"] - results["Annual Profit or Loss"] / 12) < 0.01
        assert results["Cashflow per Unit per Month"] == results["Total Monthly Profit or Loss"] / results["Units"]
    
    def test_calculate_roi_metrics(self, calculator, property_detail, user_inputs):
        """Test ROI metrics calculation"""
        results = calculator.calculate_cashflow(property_detail, user_inputs)
        
        # Check for ROI metrics
        assert "Cash on Cash ROI" in results
        assert "Equity ROI" in results
        assert "Appreciation ROI" in results
        assert "Forced Appreciation ROI" in results
        assert "Total ROI" in results
        
        # Cash on Cash ROI validation logic
        # (Annual profit / Required cash) * 100
        annual_cashflow = results["Annual Profit or Loss"]
        total_cash_required = results["Total Cash Required"]
        
        if isinstance(results["Cash on Cash ROI"], str):
            assert results["Cash on Cash ROI"] == "Infinite"
        else:
            expected_coc_roi = (annual_cashflow / total_cash_required) * 100 if total_cash_required != 0 else "Infinite"
            if isinstance(expected_coc_roi, float):
                assert abs(results["Cash on Cash ROI"] - expected_coc_roi) < 0.1
    
    def test_error_handling(self, calculator):
        """Test error handling"""
        # Invalid property data
        invalid_property = {}
        user_inputs = {"vacancyRate": 5}
        
        # Verify default values are returned without errors
        results = calculator.calculate_cashflow(invalid_property, user_inputs)
        assert results["Effective Gross Income"] == 0
        assert results["Net Operating Income"] == 0
        assert results["Annual Profit or Loss"] == 0