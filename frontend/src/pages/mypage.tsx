import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import Link from 'next/link';
import Navigation from '../components/Navigation';

// Manage API URL with environment variables
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Type definitions
interface Property {
  id: number;
  property_id: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  list_price: number;
  bedrooms: number;
  bathrooms: number;
  square_feet: number;
  thumbnail?: string;
  cashflow_per_unit?: number;
}

// Extended UserInput interface (to match backend items)
interface UserInput {
  // Property Info
  vacancyRate: number;
  managementRate: number;
  advertisingCostPerVacancy: number;
  annualAppreciationRate?: number;
  
  // Purchase Info
  repairs: number;
  repairsContingency: number;
  lenderFee: number;
  brokerFee: number;
  environmentals: number;
  inspections: number;
  appraisals: number;
  misc: number;
  legal: number;
  
  // Financing
  mtgAmortizationPeriod: number;
  firstMtgInterestRate: number;
  firstMtgAmortizationPeriod: number;
  firstMtgCMHCFee: number;
  secondMtgPrinciple: number;
  secondMtgInterestRate: number;
  secondMtgAmortization: number;
  interestOnlyPrinciple: number;
  interestOnlyRate: number;
  otherMonthlyFinancing: number;
  
  // Income
  parking?: number;
  storage?: number;
  laundry?: number;
  otherIncome?: number;
  
  // Operating Expenses
  repairsRate?: number;
  electricity?: number;
  gas?: number;
  lawnMaintenance?: number;
  waterSewer?: number;
  cable?: number;
  caretaking?: number;
  trashRemoval?: number;
  miscExpenses?: number;
  
  // Include all other items
  [key: string]: any;
}

export default function MyPage() {
  const router = useRouter();
  const { isAuthenticated, user, token, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [savedProperties, setSavedProperties] = useState<Property[]>([]);
  const [userInputs, setUserInputs] = useState<UserInput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Profile editing states
  const [isEditing, setIsEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({
    username: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [profileSuccess, setProfileSuccess] = useState('');

  // Parameter editing states
  const [isEditingParams, setIsEditingParams] = useState(false);
  const [paramsForm, setParamsForm] = useState<UserInput | null>(null);
  const [paramsSuccess, setParamsSuccess] = useState('');

  useEffect(() => {
    // Check authentication status by verifying token in local storage
    const savedToken = localStorage.getItem('token');
    
    if (!savedToken) {
      router.push('/login');
      return;
    }

    // Load user information
    fetchUserData();
  }, [router]);

  const fetchUserData = async () => {
    setIsLoading(true);
    setError('');

    try {
      const savedToken = localStorage.getItem('token') || token;
      
      // Check if token exists
      if (!savedToken) {
        setError('You are not authenticated. Please log in.');
        router.push('/login');
        return;
      }
      
      // Get user profile information
      const profileResponse = await fetch(`${API_URL}/api/user/profile`, {
        headers: {
          'Authorization': `Bearer ${savedToken}`
        }
      });

      if (profileResponse.status === 401) {
        // Handle expired or invalid token
        localStorage.removeItem('token');
        setError('Your session has expired. Please log in again.');
        router.push('/login');
        return;
      }

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        
        if (profileData.user) {
          // Use updateUser function from AuthContext
          updateUser(profileData.user);
          console.log('User profile loaded:', profileData.user);
        }
      }

      // Get saved property data
      if (activeTab === 'savedProperties') {
        const response = await fetch(`${API_URL}/api/user/saved-properties`, {
          headers: {
            'Authorization': `Bearer ${savedToken}`
          }
        });

        if (response.status === 401) {
          // Handle expired token
          localStorage.removeItem('token');
          setError('Your session has expired. Please log in again.');
          router.push('/login');
          return;
        }

        if (response.ok) {
          const data = await response.json();
          setSavedProperties(data.properties || []);
        }
      }

      // Get user input values
      if (activeTab === 'userInputs') {
        const response = await fetch(`${API_URL}/api/user/inputs`, {
          headers: {
            'Authorization': `Bearer ${savedToken}`
          }
        });

        if (response.status === 401) {
          // Handle expired token
          localStorage.removeItem('token');
          setError('Your session has expired. Please log in again.');
          router.push('/login');
          return;
        }

        if (response.ok) {
          const data = await response.json();
          console.log('User inputs API response:', data); 
          
          // Check if we have user inputs or need to use defaults
          if (data.user_inputs) {
            console.log('Using user-specific inputs');
            
            // Convert snake_case to camelCase
            const convertedInputs = convertSnakeToCamel(data.user_inputs);
            console.log('Converted inputs:', convertedInputs);
            setUserInputs(convertedInputs);
          } else if (data.default_inputs) {
            console.log('Using default inputs');
            const convertedInputs = convertSnakeToCamel(data.default_inputs);
            setUserInputs(convertedInputs);
          } else {
            console.log('No inputs found, using empty object');
            setUserInputs(null);
          }
        } else {
          console.error('Failed to fetch user inputs:', response.status, response.statusText);
        }
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Load data when tab changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchUserData();
    }
  }, [activeTab]);

  // Handle form input changes
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Start profile editing mode
  const startEditing = () => {
    if (user) {
      setProfileForm({
        username: user.username || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    }
    setIsEditing(true);
    setError('');
    setProfileSuccess('');
  };

  // Cancel profile editing
  const cancelEditing = () => {
    setIsEditing(false);
    setError('');
    setProfileSuccess('');
  };

  // Submit profile update
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setProfileSuccess('');

    // Validate password changes
    if (profileForm.newPassword) {
      if (profileForm.newPassword !== profileForm.confirmPassword) {
        setError('New passwords do not match');
        return;
      }
      
      if (!profileForm.currentPassword) {
        setError('Current password is required to change password');
        return;
      }
    }

    try {
      const savedToken = localStorage.getItem('token') || token;
      
      // Request profile update
      const response = await fetch(`${API_URL}/api/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${savedToken}`
        },
        body: JSON.stringify({
          username: profileForm.username,
          current_password: profileForm.currentPassword || undefined,
          new_password: profileForm.newPassword || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || 'Failed to update profile');
      }

      const data = await response.json();
      
      // Update user information
      if (data.user) {
        updateUser(data.user);
      }
      
      setProfileSuccess('Profile updated successfully');
      setIsEditing(false);
      
      // Reset form
      setProfileForm({
        username: data.user?.username || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile');
    }
  };

  // Start parameter editing mode
  const startEditingParams = () => {
    console.log('Current userInputs:', userInputs); // Debug current userInputs state
    if (userInputs) {
      setParamsForm({ ...userInputs });
    } else {
      // Use empty defaults if no inputs available
      setParamsForm({
        vacancyRate: 5,
        managementRate: 10,
        advertisingCostPerVacancy: 100,
        repairs: 5000,
        repairsContingency: 0,
        lenderFee: 10000,
        brokerFee: 500,
        environmentals: 0,
        inspections: 1300,
        appraisals: 1000,
        misc: 500,
        legal: 4000,
        mtgAmortizationPeriod: 30,
        firstMtgInterestRate: 6.5,
        firstMtgAmortizationPeriod: 30,
        firstMtgCMHCFee: 0,
        secondMtgPrinciple: 0,
        secondMtgInterestRate: 12,
        secondMtgAmortization: 9999,
        interestOnlyPrinciple: 0,
        interestOnlyRate: 0,
        otherMonthlyFinancing: 0
      });
    }
    setIsEditingParams(true);
    setError('');
    setParamsSuccess('');
  };
  
  // Cancel parameter editing
  const cancelEditingParams = () => {
    setIsEditingParams(false);
    setError('');
    setParamsSuccess('');
  };
  
  // Handle parameter form input changes
  const handleParamsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setParamsForm(prev => {
      if (!prev) return null;
      return {
        ...prev,
        [name]: parseFloat(value) || 0
      };
    });
  };
  
  // Submit parameter updates
  const handleParamsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setParamsSuccess('');
    
    if (!paramsForm) return;
    
    try {
      const savedToken = localStorage.getItem('token') || token;
      
      // Convert camelCase to snake_case for API submission
      const snakeCaseParams = convertCamelToSnake(paramsForm);
      
      // Request parameter update
      const response = await fetch(`${API_URL}/api/user/inputs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${savedToken}`
        },
        body: JSON.stringify(snakeCaseParams)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || 'Failed to update parameters');
      }
      
      const data = await response.json();
      
      // Update parameter information
      if (data.user_inputs) {
        const convertedInputs = convertSnakeToCamel(data.user_inputs);
        setUserInputs(convertedInputs);
      }
      
      setParamsSuccess('Investment parameters updated successfully');
      setIsEditingParams(false);
      
    } catch (err: any) {
      console.error('Error updating parameters:', err);
      setError(err.message || 'Failed to update parameters');
    }
  };

  // Helper function to convert snake_case to camelCase
  const convertSnakeToCamel = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => convertSnakeToCamel(item));
    }
    
    return Object.keys(obj).reduce((acc, key) => {
      // Convert snake_case to camelCase
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      acc[camelKey] = convertSnakeToCamel(obj[key]);
      return acc;
    }, {} as any);
  };

  // Helper function to convert camelCase to snake_case
  const convertCamelToSnake = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => convertCamelToSnake(item));
    }
    
    return Object.keys(obj).reduce((acc, key) => {
      // Convert camelCase to snake_case
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      acc[snakeKey] = convertCamelToSnake(obj[key]);
      return acc;
    }, {} as any);
  };

  return (
    <>
      {/* Added Navigation component */}
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">My Page</h1>
        
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left sidebar menu */}
          <div className="w-full md:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-md p-4">
              <nav className="space-y-1">
                <button
                  className={`w-full text-left px-4 py-3 rounded-md flex items-center ${
                    activeTab === 'profile'
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => setActiveTab('profile')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Profile
                </button>
                
                <button
                  className={`w-full text-left px-4 py-3 rounded-md flex items-center ${
                    activeTab === 'userInputs'
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => setActiveTab('userInputs')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Investment Parameters
                </button>
                
                <button
                  className={`w-full text-left px-4 py-3 rounded-md flex items-center ${
                    activeTab === 'savedProperties'
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => setActiveTab('savedProperties')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Saved Properties
                </button>
              </nav>
            </div>
          </div>
          
          {/* Right content area */}
          <div className="flex-1">
            {/* Error message */}
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            {/* Success message */}
            {profileSuccess && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                {profileSuccess}
              </div>
            )}

            {/* Loading status */}
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <>
                {/* Profile tab */}
                {activeTab === 'profile' && (
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4">User Profile</h2>
                    
                    {!isEditing ? (
                      /* Profile view mode */
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-baseline">
                            <label className="text-gray-700 text-sm font-bold mr-2">
                              Email:
                            </label>
                            <span className="text-gray-900">{user?.email || 'No email available'}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                        </div>
                        <div>
                          <div className="flex items-baseline">
                            <label className="text-gray-700 text-sm font-bold mr-2">
                              Name:
                            </label>
                            <span className="text-gray-900">{user?.username || 'No name available'}</span>
                          </div>
                        </div>
                        <div className="pt-4">
                          <button 
                            onClick={startEditing}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Edit Profile
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Profile editing mode */
                      <form onSubmit={handleProfileSubmit} className="space-y-4">
                        <div>
                          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                            Email:
                          </label>
                          <input
                            type="email"
                            value={user?.email || ''}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                        </div>
                        
                        <div>
                          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
                            Name:
                          </label>
                          <input
                            id="username"
                            name="username"
                            type="text"
                            value={profileForm.username}
                            onChange={handleProfileChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>
                        
                        <div className="border-t border-gray-200 pt-4 mt-4">
                          <h3 className="font-medium text-gray-700 mb-3">Change Password (optional)</h3>
                          
                          <div className="space-y-3">
                            <div>
                              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="currentPassword">
                                Current Password:
                              </label>
                              <input
                                id="currentPassword"
                                name="currentPassword"
                                type="password"
                                value={profileForm.currentPassword}
                                onChange={handleProfileChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="newPassword">
                                New Password:
                              </label>
                              <input
                                id="newPassword"
                                name="newPassword"
                                type="password"
                                value={profileForm.newPassword}
                                onChange={handleProfileChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirmPassword">
                                Confirm New Password:
                              </label>
                              <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                value={profileForm.confirmPassword}
                                onChange={handleProfileChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex space-x-3 pt-4">
                          <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Save Changes
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditing}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* Investment parameter tab */}
                {activeTab === 'userInputs' && (
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4">Investment Parameters</h2>
                    
                    {!isEditingParams ? (
                      /* Parameter view mode */
                      <>
                        {userInputs ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                            {/* Property Info section */}
                            <div>
                              <h3 className="font-medium text-lg mb-3 border-b pb-2">Property Info</h3>
                              <div className="space-y-2">
                                <div className="flex items-baseline">
                                  <label className="text-gray-700 text-sm font-medium mr-2 w-1/2">
                                    Vacancy Rate:
                                  </label>
                                  <span className="text-gray-900">{userInputs.vacancyRate !== undefined ? `${userInputs.vacancyRate}%` : 'N/A'}</span>
                                </div>
                                <div className="flex items-baseline">
                                  <label className="text-gray-700 text-sm font-medium mr-2 w-1/2">
                                    Management Rate:
                                  </label>
                                  <span className="text-gray-900">{userInputs.managementRate !== undefined ? `${userInputs.managementRate}%` : 'N/A'}</span>
                                </div>
                                <div className="flex items-baseline">
                                  <label className="text-gray-700 text-sm font-medium mr-2 w-1/2">
                                    Advertising Cost:
                                  </label>
                                  <span className="text-gray-900">{userInputs.advertisingCostPerVacancy !== undefined ? `$${userInputs.advertisingCostPerVacancy}` : 'N/A'}</span>
                                </div>
                              </div>
                              
                              {/* Purchase Info section */}
                              <h3 className="font-medium text-lg mt-6 mb-3 border-b pb-2">Purchase Info</h3>
                              <div className="space-y-2">
                                <div className="flex items-baseline">
                                  <label className="text-gray-700 text-sm font-medium mr-2 w-1/2">
                                    Repairs:
                                  </label>
                                  <span className="text-gray-900">{userInputs.repairs !== undefined ? `$${userInputs.repairs}` : 'N/A'}</span>
                                </div>
                                <div className="flex items-baseline">
                                  <label className="text-gray-700 text-sm font-medium mr-2 w-1/2">
                                    Lender Fee:
                                  </label>
                                  <span className="text-gray-900">{userInputs.lenderFee !== undefined ? `$${userInputs.lenderFee}` : 'N/A'}</span>
                                </div>
                                <div className="flex items-baseline">
                                  <label className="text-gray-700 text-sm font-medium mr-2 w-1/2">
                                    Broker Fee:
                                  </label>
                                  <span className="text-gray-900">{userInputs.brokerFee !== undefined ? `$${userInputs.brokerFee}` : 'N/A'}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              {/* Financing section */}
                              <h3 className="font-medium text-lg mb-3 border-b pb-2">Financing</h3>
                              <div className="space-y-2">
                                <div className="flex items-baseline">
                                  <label className="text-gray-700 text-sm font-medium mr-2 w-1/2">
                                    Amortization Period:
                                  </label>
                                  <span className="text-gray-900">{userInputs.mtgAmortizationPeriod !== undefined ? `${userInputs.mtgAmortizationPeriod} years` : 'N/A'}</span>
                                </div>
                                <div className="flex items-baseline">
                                  <label className="text-gray-700 text-sm font-medium mr-2 w-1/2">
                                    Interest Rate:
                                  </label>
                                  <span className="text-gray-900">{userInputs.firstMtgInterestRate !== undefined ? `${userInputs.firstMtgInterestRate}%` : 'N/A'}</span>
                                </div>
                                <div className="flex items-baseline">
                                  <label className="text-gray-700 text-sm font-medium mr-2 w-1/2">
                                    Second Mortgage Rate:
                                  </label>
                                  <span className="text-gray-900">{userInputs.secondMtgInterestRate !== undefined ? `${userInputs.secondMtgInterestRate}%` : 'N/A'}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-600">Loading investment parameters...</p>
                        )}
                        <div className="mt-6">
                          <button 
                            onClick={startEditingParams}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Edit Parameters
                          </button>
                        </div>
                      </>
                    ) : (
                      /* Parameter editing mode */
                      <form onSubmit={handleParamsSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                          {/* Property Info section */}
                          <div>
                            <h3 className="font-medium text-lg mb-3 border-b pb-2">Property Info</h3>
                            <div className="space-y-4">
                              <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="vacancyRate">
                                  Vacancy Rate (%):
                                </label>
                                <input
                                  id="vacancyRate"
                                  name="vacancyRate"
                                  type="number"
                                  step="0.01"
                                  value={paramsForm?.vacancyRate || 0}
                                  onChange={handleParamsChange}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="managementRate">
                                  Management Rate (%):
                                </label>
                                <input
                                  id="managementRate"
                                  name="managementRate"
                                  type="number"
                                  step="0.01"
                                  value={paramsForm?.managementRate || 0}
                                  onChange={handleParamsChange}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="advertisingCostPerVacancy">
                                  Advertising Cost ($):
                                </label>
                                <input
                                  id="advertisingCostPerVacancy"
                                  name="advertisingCostPerVacancy"
                                  type="number"
                                  step="0.01"
                                  value={paramsForm?.advertisingCostPerVacancy || 0}
                                  onChange={handleParamsChange}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                            </div>
                            
                            {/* Purchase Info section */}
                            <h3 className="font-medium text-lg mt-6 mb-3 border-b pb-2">Purchase Info</h3>
                            <div className="space-y-4">
                              <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="repairs">
                                  Repairs ($):
                                </label>
                                <input
                                  id="repairs"
                                  name="repairs"
                                  type="number"
                                  step="0.01"
                                  value={paramsForm?.repairs || 0}
                                  onChange={handleParamsChange}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="lenderFee">
                                  Lender Fee ($):
                                </label>
                                <input
                                  id="lenderFee"
                                  name="lenderFee"
                                  type="number"
                                  step="0.01"
                                  value={paramsForm?.lenderFee || 0}
                                  onChange={handleParamsChange}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="brokerFee">
                                  Broker Fee ($):
                                </label>
                                <input
                                  id="brokerFee"
                                  name="brokerFee"
                                  type="number"
                                  step="0.01"
                                  value={paramsForm?.brokerFee || 0}
                                  onChange={handleParamsChange}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            {/* Financing section */}
                            <h3 className="font-medium text-lg mb-3 border-b pb-2">Financing</h3>
                            <div className="space-y-4">
                              <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="mtgAmortizationPeriod">
                                  Amortization Period (years):
                                </label>
                                <input
                                  id="mtgAmortizationPeriod"
                                  name="mtgAmortizationPeriod"
                                  type="number"
                                  step="1"
                                  value={paramsForm?.mtgAmortizationPeriod || 0}
                                  onChange={handleParamsChange}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="firstMtgInterestRate">
                                  Interest Rate (%):
                                </label>
                                <input
                                  id="firstMtgInterestRate"
                                  name="firstMtgInterestRate"
                                  type="number"
                                  step="0.01"
                                  value={paramsForm?.firstMtgInterestRate || 0}
                                  onChange={handleParamsChange}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="secondMtgInterestRate">
                                  Second Mortgage Rate (%):
                                </label>
                                <input
                                  id="secondMtgInterestRate"
                                  name="secondMtgInterestRate"
                                  type="number"
                                  step="0.01"
                                  value={paramsForm?.secondMtgInterestRate || 0}
                                  onChange={handleParamsChange}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex space-x-3 pt-4">
                          <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Save Parameters
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditingParams}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* Saved properties tab */}
                {activeTab === 'savedProperties' && (
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4">Saved Properties</h2>
                    {savedProperties.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {savedProperties.map((property) => (
                          <div key={property.id} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                            {property.thumbnail && (
                              <img 
                                src={property.thumbnail} 
                                alt={property.address} 
                                className="w-full h-48 object-cover"
                              />
                            )}
                            <div className="p-4">
                              <h3 className="font-semibold text-lg mb-1">{property.address}</h3>
                              <p className="text-gray-600 mb-2">{property.city}, {property.state} {property.postal_code}</p>
                              <p className="text-lg font-bold text-blue-600 mb-2">${property.list_price.toLocaleString()}</p>
                              <div className="flex items-center text-sm text-gray-500 mb-3">
                                <span className="mr-3">{property.bedrooms} Beds</span>
                                <span className="mr-3">{property.bathrooms} Baths</span>
                                <span>{property.square_feet.toLocaleString()} sqft</span>
                              </div>
                              <p className="text-green-600 font-medium">
                                Monthly Cashflow: ${property.cashflow_per_unit ? property.cashflow_per_unit.toFixed(2) : 'N/A'}
                              </p>
                              <div className="mt-4 flex space-x-2">
                                <Link 
                                  href={`/properties/${property.property_id}`}
                                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                                >
                                  View Details
                                </Link>
                                <button className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700">
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600">No properties saved yet.</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
} 