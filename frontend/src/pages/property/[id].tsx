import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Navigation from '@/components/Navigation';
import { API_URL } from '@/config';
import axios from 'axios';
import React from 'react';

// Types
interface PropertyItem {
            name: string;
  value_type: 'API Data' | 'user input' | 'Calculated';
  section: string;
  format?: string;
}

interface PropertyDetail {
  properties: Array<{
    api_data: any;
    calculated_data: any;
    user_inputs: any;
    cashflow_per_unit: number;
  }>;
}

// Grouped items based on the All Items notepad
const groupedItems: Record<string, PropertyItem[]> = {
  'Property Info': [
    { name: 'Fair Market Value', value_type: 'API Data', section: 'Property Info', format: 'currency' },
    { name: 'Vacancy Rate', value_type: 'user input', section: 'Property Info', format: 'percentage' },
    { name: 'Management Rate', value_type: 'user input', section: 'Property Info', format: 'percentage' },
    { name: 'Advertising Cost per Vacancy', value_type: 'user input', section: 'Property Info', format: 'currency' },
    { name: 'Number of Units', value_type: 'API Data', section: 'Property Info', format: 'number' },
    { name: 'Annual Appreciation Rate', value_type: 'user input', section: 'Property Info', format: 'percentage' }
  ],
  'Purchase Info': [
    { name: 'Offer Price', value_type: 'API Data', section: 'Purchase Info', format: 'currency' },
    { name: 'Repairs', value_type: 'user input', section: 'Purchase Info', format: 'currency' },
    { name: 'Repairs Contingency', value_type: 'user input', section: 'Purchase Info', format: 'currency' },
    { name: 'Lender Fee', value_type: 'user input', section: 'Purchase Info', format: 'currency' },
    { name: 'Broker Fee', value_type: 'user input', section: 'Purchase Info', format: 'currency' },
    { name: 'Environmentals', value_type: 'user input', section: 'Purchase Info', format: 'currency' },
    { name: 'Inspections', value_type: 'user input', section: 'Purchase Info', format: 'currency' },
    { name: 'Appraisals', value_type: 'user input', section: 'Purchase Info', format: 'currency' },
    { name: 'Misc', value_type: 'user input', section: 'Purchase Info', format: 'currency' },
    { name: 'Transfer Tax', value_type: 'API Data', section: 'Purchase Info', format: 'currency' },
    { name: 'Legal', value_type: 'user input', section: 'Purchase Info', format: 'currency' },
    { name: 'Real Purchase Price (RPP)', value_type: 'Calculated', section: 'Purchase Info', format: 'currency' }
  ],
  'Financing (Monthly)': [
    { name: '1st Mtg Principle Borrowed', value_type: 'Calculated', section: 'Financing (Monthly)', format: 'currency' },
    { name: '1st Mtg Interest Rate', value_type: 'API Data', section: 'Financing (Monthly)', format: 'percentage' },
    { name: '1st Mtg Amortization Period', value_type: 'user input', section: 'Financing (Monthly)', format: 'number' },
    { name: '1st Mtg CMHC Fee', value_type: 'user input', section: 'Financing (Monthly)', format: 'percentage' },
    { name: '1st Mtg Total Principle', value_type: 'Calculated', section: 'Financing (Monthly)', format: 'currency' },
    { name: '1st Mtg Total Monthly Payment', value_type: 'Calculated', section: 'Financing (Monthly)', format: 'currency' },
    { name: '2nd Mtg Principle Amount', value_type: 'user input', section: 'Financing (Monthly)', format: 'currency' },
    { name: '2nd Mtg Interest Rate', value_type: 'user input', section: 'Financing (Monthly)', format: 'percentage' },
    { name: '2nd Mtg Amortization Period', value_type: 'user input', section: 'Financing (Monthly)', format: 'number' },
    { name: '2nd Mtg Total Monthly Payment', value_type: 'Calculated', section: 'Financing (Monthly)', format: 'currency' },
    { name: 'Interest Only Principle Amount', value_type: 'user input', section: 'Financing (Monthly)', format: 'currency' },
    { name: 'Interest Only Interest Rate', value_type: 'user input', section: 'Financing (Monthly)', format: 'percentage' },
    { name: 'Interest Only Total Monthly Payment', value_type: 'Calculated', section: 'Financing (Monthly)', format: 'currency' },
    { name: 'Other Monthly Financing Costs', value_type: 'user input', section: 'Financing (Monthly)', format: 'currency' },
    { name: 'Cash Required to Close', value_type: 'Calculated', section: 'Financing (Monthly)', format: 'currency' }
  ],
  'Income (Annual)': [
    { name: 'Gross Rents', value_type: 'API Data', section: 'Income (Annual)', format: 'currency' },
    { name: 'Parking', value_type: 'user input', section: 'Income (Annual)', format: 'currency' },
    { name: 'Storage', value_type: 'user input', section: 'Income (Annual)', format: 'currency' },
    { name: 'Laundry / Vending', value_type: 'user input', section: 'Income (Annual)', format: 'currency' },
    { name: 'Other Income', value_type: 'user input', section: 'Income (Annual)', format: 'currency' },
    { name: 'Total Income', value_type: 'Calculated', section: 'Income (Annual)', format: 'currency' },
    { name: 'Vacancy Loss', value_type: 'Calculated', section: 'Income (Annual)', format: 'currency' },
    { name: 'Effective Gross Income', value_type: 'Calculated', section: 'Income (Annual)', format: 'currency' }
  ],
  'Operating Expenses (Annual)': [
    { name: 'Property Taxes', value_type: 'API Data', section: 'Operating Expenses (Annual)', format: 'currency' },
    { name: 'Insurance', value_type: 'API Data', section: 'Operating Expenses (Annual)', format: 'currency' },
    { name: 'Repairs', value_type: 'user input', section: 'Operating Expenses (Annual)', format: 'currency' },
    { name: 'Electricity', value_type: 'user input', section: 'Operating Expenses (Annual)', format: 'currency' },
    { name: 'Gas', value_type: 'user input', section: 'Operating Expenses (Annual)', format: 'currency' },
    { name: 'Lawn / Snow Maintenance', value_type: 'user input', section: 'Operating Expenses (Annual)', format: 'currency' },
    { name: 'Water / Sewer', value_type: 'user input', section: 'Operating Expenses (Annual)', format: 'currency' },
    { name: 'Cable', value_type: 'user input', section: 'Operating Expenses (Annual)', format: 'currency' },
    { name: 'Management', value_type: 'Calculated', section: 'Operating Expenses (Annual)', format: 'currency' },
    { name: 'Caretaking', value_type: 'user input', section: 'Operating Expenses (Annual)', format: 'currency' },
    { name: 'Advertising', value_type: 'Calculated', section: 'Operating Expenses (Annual)', format: 'currency' },
    { name: 'Association Fees', value_type: 'API Data', section: 'Operating Expenses (Annual)', format: 'currency' },
    { name: 'Pest Control', value_type: 'Calculated', section: 'Operating Expenses (Annual)', format: 'currency' },
    { name: 'Security', value_type: 'Calculated', section: 'Operating Expenses (Annual)', format: 'currency' },
    { name: 'Trash Removal', value_type: 'user input', section: 'Operating Expenses (Annual)', format: 'currency' },
    { name: 'Miscellaneous', value_type: 'user input', section: 'Operating Expenses (Annual)', format: 'currency' },
    { name: 'Common Area Maintenance', value_type: 'user input', section: 'Operating Expenses (Annual)', format: 'currency' },
    { name: 'Capital Improvements', value_type: 'user input', section: 'Operating Expenses (Annual)', format: 'currency' },
    { name: 'Accounting', value_type: 'user input', section: 'Operating Expenses (Annual)', format: 'currency' },
    { name: 'Legal', value_type: 'user input', section: 'Operating Expenses (Annual)', format: 'currency' },
    { name: 'Bad Debts', value_type: 'user input', section: 'Operating Expenses (Annual)', format: 'currency' },
    { name: 'Other Expenses', value_type: 'user input', section: 'Operating Expenses (Annual)', format: 'currency' },
    { name: 'Evictions', value_type: 'Calculated', section: 'Operating Expenses (Annual)', format: 'currency' },
    { name: 'Total Expenses', value_type: 'Calculated', section: 'Operating Expenses (Annual)', format: 'currency' }
  ],
  'Net Operating Income (Annual)': [
    { name: 'Net Operating Income', value_type: 'Calculated', section: 'Net Operating Income (Annual)', format: 'currency' }
  ],
  'Cash Requirements': [
    { name: 'Deposit(s) made with Offer', value_type: 'user input', section: 'Cash Requirements', format: 'currency' },
    { name: 'Less Pro-Ration of Rents', value_type: 'user input', section: 'Cash Requirements', format: 'currency' },
    { name: 'Cash Required to Close', value_type: 'Calculated', section: 'Cash Requirements', format: 'currency' },
    { name: 'Total Cash Required', value_type: 'Calculated', section: 'Cash Requirements', format: 'currency' }
  ],
  'Cashflow Summary (Annual)': [
    { name: 'Effective Gross Income', value_type: 'Calculated', section: 'Cashflow Summary (Annual)', format: 'currency' },
    { name: 'Operating Expenses', value_type: 'Calculated', section: 'Cashflow Summary (Annual)', format: 'currency' },
    { name: 'Net Operating Income', value_type: 'Calculated', section: 'Cashflow Summary (Annual)', format: 'currency' },
    { name: 'Debt Servicing Costs', value_type: 'Calculated', section: 'Cashflow Summary (Annual)', format: 'currency' },
    { name: 'Annual Profit or Loss', value_type: 'Calculated', section: 'Cashflow Summary (Annual)', format: 'currency' },
    { name: 'Total Monthly Profit or Loss', value_type: 'Calculated', section: 'Cashflow Summary (Annual)', format: 'currency' },
    { name: 'Cashflow per Unit per Month', value_type: 'Calculated', section: 'Cashflow Summary (Annual)', format: 'currency' }
  ],
  'Quick Analysis': [
    { name: '1st Mortgage LTV', value_type: 'Calculated', section: 'Quick Analysis', format: 'percentage' },
    { name: '1st Mortgage LTPP', value_type: 'Calculated', section: 'Quick Analysis', format: 'percentage' },
    { name: '2nd Mortgage LTV', value_type: 'Calculated', section: 'Quick Analysis', format: 'percentage' },
    { name: '2nd Mortgage LTPP', value_type: 'Calculated', section: 'Quick Analysis', format: 'percentage' },
    { name: 'Cap Rate on PP', value_type: 'Calculated', section: 'Quick Analysis', format: 'percentage' },
    { name: 'Cap Rate on FMV', value_type: 'Calculated', section: 'Quick Analysis', format: 'percentage' },
    { name: 'Average Rent', value_type: 'Calculated', section: 'Quick Analysis', format: 'currency' },
    { name: 'GRM', value_type: 'Calculated', section: 'Quick Analysis', format: 'number' },
    { name: 'DCR', value_type: 'Calculated', section: 'Quick Analysis', format: 'number' },
    { name: 'Cash on Cash ROI', value_type: 'Calculated', section: 'Quick Analysis', format: 'percentage' },
    { name: 'Equity ROI (After 1 Year)', value_type: 'Calculated', section: 'Quick Analysis', format: 'percentage' },
    { name: 'Appreciation ROI (After 1 Year)', value_type: 'Calculated', section: 'Quick Analysis', format: 'percentage' },
    { name: 'Total ROI (After 1 Year)', value_type: 'Calculated', section: 'Quick Analysis', format: 'percentage' },
    { name: 'Forced App. ROI (After 1 Year)', value_type: 'Calculated', section: 'Quick Analysis', format: 'percentage' },
    { name: 'Expense to Income Ratio', value_type: 'Calculated', section: 'Quick Analysis', format: 'percentage' }
  ]
};

// Display currency values without decimal points
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Multiply percentage values by 100 and display up to 2 decimal places
const formatPercentage = (value: number) => {
  return `${(value * 100).toFixed(2)}%`;
};

// Display regular numbers without decimal points
const formatNumber = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const formatValue = (value: any, item: PropertyItem) => {
  if (value == null) return 'N/A';
  
  // Convert values to integers if not a percentage field
  if (item.format !== 'percentage' && 
      !item.name.toLowerCase().includes('rate') && 
      !item.name.toLowerCase().includes('ratio')) {
    value = Math.round(value);
  }
  
  if (item.format === 'percentage' || 
      item.name.toLowerCase().includes('rate') || 
      item.name.toLowerCase().includes('ratio')) {
    return formatPercentage(value);
  }
  
  if (item.format === 'currency' || 
      item.name.toLowerCase().includes('price') || 
      item.name.toLowerCase().includes('cost') || 
      item.name.toLowerCase().includes('value') ||
      item.name.toLowerCase().includes('fee') ||
      item.name.toLowerCase().includes('rent') ||
      item.name.toLowerCase().includes('income') ||
      item.name.toLowerCase().includes('expense') ||
      item.name.toLowerCase().includes('tax') ||
      item.name.toLowerCase().includes('insurance') ||
      item.name.toLowerCase().includes('cashflow') ||
      item.name.toLowerCase().includes('cash')) {
    return formatCurrency(value);
  }
  
  if (typeof value === 'number') {
    return formatNumber(value);
  }
  
  return value.toString();
};

// Value change handler helper
const getValue = (item: PropertyItem, property: any) => {
  try {
    if (item.value_type === 'API Data') {
      switch (item.name) {
        case 'Address':
          return property.api_data.address || 'Address not available';
          
        case 'Fair Market Value':
          return property.api_data.fair_market_value;
        case 'Number of Units':
          return property.api_data.number_of_units || 1;
        case 'Offer Price':
          return property.api_data.offer_price;
        case '1st Mtg Interest Rate':
          return property.api_data.first_mtg_interest_rate || 0;
        case 'Property Taxes':
          return Math.round(property.api_data.property_taxes || 0);
        case 'Insurance':
          return property.api_data.insurance || 0;
        case 'Association Fees':
          return property.api_data.association_fees || 0;
        case 'Gross Rents':
          return property.api_data.gross_rents || 0;
        case 'Transfer Tax':
          return property.api_data.transfer_tax || 0;
        default:
          console.log('Missing API Data case for:', item.name);
          return 0;
      }
    }
    
    if (item.value_type === 'user input') {
      const key = item.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) => 
          index === 0 ? letter.toLowerCase() : letter.toLowerCase()
        );
      
      // Add specific field name mappings
      const keyMappings: Record<string, string> = {
        'advertising_cost_per_vacancy': 'advertising_cost_per_vacancy',
        'laundry___vending': 'laundry_vending',
        'lawn___snow_maintenance': 'lawn_maintenance',
        'water___sewer': 'water_sewer',
        'deposit_s__made_with_offer': 'deposit_with_offer',
        'interest_only_principle_amount': 'interest_only_principle',
        'interest_only_interest_rate': 'interest_only_rate',
        'other_monthly_financing_costs': 'other_monthly_financing',
        '2nd_mtg_principle_amount': 'second_mtg_principle',
        '2nd_mtg_interest_rate': 'second_mtg_interest_rate',
        '2nd_mtg_amortization_period': 'second_mtg_amortization',
        '1st_mtg_amortization_period': 'first_mtg_amortization_period',
        '1st_mtg_cmhc_fee': 'first_mtg_cmhc_fee',
        'annual_appreciation_rate': 'annual_appreciation_rate'
      };
      
      const mappedKey = keyMappings[key] || key;
      console.log('User input key:', mappedKey, 'Value:', property.user_inputs[mappedKey]);
      return property.user_inputs[mappedKey] ?? 0;
    }
    
    if (item.value_type === 'Calculated') {
      // Add key name mappings for calculated fields
      const calculatedKeyMappings: Record<string, string> = {
        'Real Purchase Price (RPP)': 'Real Purchase Price',
        '1st Mtg Principle Borrowed': 'First Mortgage Principle Borrowed',
        '1st Mtg Total Principle': 'First Mortgage Total Principle',
        '1st Mtg Total Monthly Payment': 'First Mortgage Total Monthly Payment',
        '2nd Mtg Total Monthly Payment': 'Second Mortgage Total Monthly Payment',
        'Vacancy Loss': 'Vacancy Loss Percentage',
        '1st Mortgage LTV': 'First Mortgage LTV',
        '1st Mortgage LTPP': 'First Mortgage LTPP',
        '2nd Mortgage LTV': 'Second Mortgage LTV',
        '2nd Mortgage LTPP': 'Second Mortgage LTPP',
        'Equity ROI (After 1 Year)': 'Equity ROI after 1 Year',
        'Appreciation ROI (After 1 Year)': 'Appreciation ROI after 1 Year',
        'Total ROI (After 1 Year)': 'Total ROI after 1 Year',
        'Forced App. ROI (After 1 Year)': 'Forced App ROI after 1 Year'
      };
      
      const mappedKey = calculatedKeyMappings[item.name] || item.name;
      console.log('Calculated key:', item.name, 'Value:', property.calculated_data[mappedKey]);
      return property.calculated_data[mappedKey] ?? 0;
    }
    
    return 0;
  } catch (error) {
    console.error('Error getting value for:', item.name, error);
    return 'Error loading data';
  }
};

const PropertyDetail = () => {
  const router = useRouter();
  const { id } = router.query;
  const [propertyDetail, setPropertyDetail] = useState<PropertyDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modifiedValues, setModifiedValues] = useState<Record<string, any>>({});

  // Get token from localStorage
  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };

  const fetchPropertyDetail = async () => {
    if (!id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const token = getToken();
      const endpoint = `${API_URL}/api/properties/search-cashflow-by-property-id`;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const response = await axios.get(`${endpoint}?property_id=${id}`, { headers });
      console.log('API Response:', response.data);
      setPropertyDetail(response.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
        const updatedValues = collectCurrentValues();
        console.log('Sending values for recalculation:', updatedValues);
        
        const token = getToken();
        const endpoint = `${API_URL}/api/properties/recalculate`;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        const response = await axios.post(endpoint, {
            property_id: id,
            values: updatedValues
        }, { headers });

        console.log('Recalculation response:', response.data);
        setPropertyDetail(response.data);
    } catch (err: any) {
        console.error('Recalculation error:', err);
        setError('Failed to recalculate values');
    } finally {
        setIsRecalculating(false);
    }
  };

  const handleSaveProperty = async () => {
    const token = getToken();
    if (!token) {
      setError('Please login to save properties');
      return;
    }

    try {
      await axios.post(
        `${API_URL}/api/user/saved-properties/${id}`,
        {
          property_data: propertyDetail?.properties[0]
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
    } catch (err: any) {
      setError('Failed to save property');
    }
  };

  const handleSaveDefaultInputs = async () => {
    const token = getToken();
    if (!token) {
      setError('Please login to save default inputs');
      return;
    }

    try {
      await axios.post(
        `${API_URL}/api/user/inputs`,
        {
          inputs: propertyDetail?.properties[0].user_inputs
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
    } catch (err: any) {
      setError('Failed to save default inputs');
    }
  };

  const handleValueChange = (itemName: string, value: string) => {
    setModifiedValues(prev => ({
      ...prev,
      [itemName.toLowerCase().replace(/ /g, '_')]: parseFloat(value) || 0
    }));
  };

  const collectCurrentValues = () => {
    const property = propertyDetail?.properties[0];
    if (!property) return {};

    // Set API Data values first
    const currentValues: Record<string, any> = {
        address: property.api_data.address || '',
        fair_market_value: property.api_data.fair_market_value,
        number_of_units: property.api_data.number_of_units,
        offer_price: property.api_data.offer_price,
        transfer_tax: property.api_data.transfer_tax,
        first_mtg_interest_rate: property.api_data.first_mtg_interest_rate,
        gross_rents: property.api_data.gross_rents,
        property_taxes: property.api_data.property_taxes,
        insurance: property.api_data.insurance,
        association_fees: property.api_data.association_fees,
    };

    // Define mappings for User Input values
    const userInputMappings: Record<string, string> = {
        'vacancy_rate': 'vacancy_rate',
        'management_rate': 'management_rate',
        'advertising_cost_per_vacancy': 'advertising_cost_per_vacancy',
        'annual_appreciation_rate': 'annual_appreciation_rate',
        'repairs': 'repairs',
        'repairs_contingency': 'repairs_contingency',
        'lender_fee': 'lender_fee',
        'broker_fee': 'broker_fee',
        'environmentals': 'environmentals',
        'inspections': 'inspections',
        'appraisals': 'appraisals',
        'misc': 'misc',
        'legal': 'legal',
        'first_mtg_amortization_period': 'first_mtg_amortization_period',
        'first_mtg_cmhc_fee': 'first_mtg_cmhc_fee',
        'second_mtg_principle': 'second_mtg_principle',
        'second_mtg_interest_rate': 'second_mtg_interest_rate',
        'second_mtg_amortization': 'second_mtg_amortization',
        'interest_only_principle': 'interest_only_principle',
        'interest_only_rate': 'interest_only_rate',
        'other_monthly_financing': 'other_monthly_financing',
        'parking': 'parking',
        'storage': 'storage',
        'laundry_vending': 'laundry_vending',
        'other_income': 'other_income',
        'electricity': 'electricity',
        'gas': 'gas',
        'lawn_maintenance': 'lawn_maintenance',
        'water_sewer': 'water_sewer',
        'cable': 'cable',
        'caretaking': 'caretaking',
        'trash_removal': 'trash_removal',
        'miscellaneous': 'miscellaneous',
        'common_area_maintenance': 'common_area_maintenance',
        'capital_improvements': 'capital_improvements',
        'accounting': 'accounting',
        'bad_debts': 'bad_debts',
        'other_expenses': 'other_expenses',
        'deposit_with_offer': 'deposit_with_offer',
        'less_pro_ration_of_rents': 'less_pro_ration_of_rents'
    };

    // Set User Input values
    Object.entries(userInputMappings).forEach(([key, mappedKey]) => {
        // Use modified value if exists, otherwise use original user_inputs value
        currentValues[key] = modifiedValues[key] ?? property.user_inputs[mappedKey] ?? 0;
    });

    // Log for debugging
    console.log('Collected values:', currentValues);

    return currentValues;
  };

  // Improved error handling
  const handleError = (error: any, context: string) => {
    console.error(`Error in ${context}:`, error);
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        setError('Please login to continue');
        router.push('/login');
      } else {
        setError(error.response?.data?.detail || error.message);
      }
    } else {
      setError(`Failed to ${context.toLowerCase()}`);
    }
  };

  // Render value with input field for editable values
  const renderValue = (item: PropertyItem, property: any) => {
    const value = getValue(item, property);
    
    // Address is handled specially
    if (item.name === 'Address') {
      return <div className="text-right">{value}</div>;
    }
    
    if (item.value_type === 'API Data' || item.value_type === 'user input') {
      const inputValue = modifiedValues[item.name.toLowerCase().replace(/ /g, '_')] ?? value ?? 0;
      
      // Format only during display, not during input
      if (item.format === 'currency') {
        return (
          <div className="flex items-center justify-end">
            <span className="mr-1">$</span>
            <input
              type="number"
              value={inputValue}
              onChange={(e) => handleValueChange(item.name, e.target.value)}
              className="w-full p-1 border rounded text-right"
              step="any"
            />
          </div>
        );
      } else if (item.format === 'percentage') {
        // Display percentage fields with value multiplied by 100 during input
        const displayValue = item.name === 'Vacancy Rate' || 
                            item.name === 'Management Rate' || 
                            item.name === '1st Mtg Interest Rate' || 
                            item.name === '2nd Mtg Interest Rate' || 
                            item.name === '1st Mtg CMHC Fee' || 
                            item.name === 'Interest Only Interest Rate' || 
                            item.name === 'Annual Appreciation Rate' ? 
                            parseFloat((inputValue * 100).toFixed(2)) : parseFloat(inputValue.toFixed(2));
        
        return (
          <div className="flex items-center justify-end">
            <input
              type="number"
              value={displayValue}
              onChange={(e) => {
                // Convert input value back to decimal form for storage
                const newValue = item.name === 'Vacancy Rate' || 
                                item.name === 'Management Rate' || 
                                item.name === '1st Mtg Interest Rate' || 
                                item.name === '2nd Mtg Interest Rate' || 
                                item.name === '1st Mtg CMHC Fee' || 
                                item.name === 'Interest Only Interest Rate' || 
                                item.name === 'Annual Appreciation Rate' ? 
                                parseFloat(e.target.value) / 100 : parseFloat(e.target.value);
                handleValueChange(item.name, newValue.toString());
              }}
              className="w-full p-1 border rounded text-right"
              step="any"
            />
            <span className="ml-1">%</span>
          </div>
        );
      }
      
      return (
        <input
          type="number"
          value={inputValue}
          onChange={(e) => handleValueChange(item.name, e.target.value)}
          className="w-full p-1 border rounded text-right"
          step="any"
        />
      );
    }
    
    return formatValue(value ?? 0, item);
  };

  useEffect(() => {
    if (id) {
      fetchPropertyDetail();
    }
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading property details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8 bg-red-50 rounded-lg">
          <div className="text-red-600 text-xl mb-4">Error</div>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              fetchPropertyDetail();
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const property = propertyDetail?.properties[0];
  if (!property) {
    return <div>No property data available</div>;
  }

  return (
    <div>
      <Head>
        <title>Property Analysis - Real Estate Investment Calculator</title>
      </Head>

      <Navigation />

      <main className="container mx-auto px-4 py-8">
        {/* Fixed Header */}
        <div className="sticky top-0 bg-white z-10 p-4 shadow-md flex justify-center">
          <div className="w-[90%]">
            <div className="flex justify-between items-center mb-4">
              <div className="text-2xl font-bold">
                {property.api_data.address ? 
                  property.api_data.address : 
                  'Property Address'}
              </div>
              <div className="flex gap-4">
                        <button 
                  onClick={handleRecalculate}
                  disabled={isRecalculating}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                        >
                  {isRecalculating ? 'Recalculating...' : 'Recalculate'}
                        </button>
                        <button 
                  onClick={handleSaveProperty}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                        >
                  Save Property
                        </button>
                        <button 
                  onClick={handleSaveDefaultInputs}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                        >
                  Save User Inputs
                        </button>
                        </div>
                        </div>
            <div className="text-lg">
              <span>Cashflow per Unit per Month:{' '}</span>
              <span className={property.cashflow_per_unit >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatCurrency(property.cashflow_per_unit)}
              </span>
                        </div>
                        </div>
                        </div>

        {/* Property Details Section */}
        <div className="mt-8 px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(groupedItems).map(([section, items]) => (
              <div key={section} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-gray-100 p-3 font-bold text-lg border-b">
                  {section}
                        </div>
                <div className="p-0">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-[#e5e5e5]">
                        <th className="border p-2 text-center w-1/2">Item</th>
                        <th className="border p-2 text-center w-1/3">Value</th>
                        <th className="border p-2 text-center w-1/6">Type</th>
                    </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.name}>
                          <td className="border p-2">{item.name}</td>
                          <td className="border p-2 text-right">
                            {renderValue(item, property)}
                      </td>
                          <td className="border p-2 text-center">
                            <span className={`px-2 py-1 rounded text-sm ${
                              item.value_type === 'API Data' 
                                ? 'bg-blue-100 text-blue-800'
                                : item.value_type === 'user input'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {item.value_type}
                            </span>
                      </td>
                    </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default PropertyDetail; 
