import { NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useAuth } from '../contexts/AuthContext'
import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import debounce from 'lodash/debounce'
import Navigation from '../components/Navigation'

// Define interfaces
interface AutocompleteSuggestion {
  city?: string;
  state_code?: string;
  postal_code?: string;
  line?: string;
  area_type?: string;
  country?: string;
}

interface SearchParams {
  postal_code?: string;
  city?: string;
  state_code?: string;
}

// EC2 instance API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error('API_URL is not defined');
}

const Home: NextPage = () => {
  const { isAuthenticated, logout } = useAuth()
  const [address, setAddress] = useState('')
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState<number>(-1)
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  // Autocomplete handler
  const handleAutocomplete = async (input: string) => {
    if (!input.trim() || input.length < 3) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/api/locations/v2/auto-complete`, {
        params: {
          input: input,
          limit: 10
        }
      });

      // Filter out suggestions with area_type 'state', 'school', and 'school_district'
      const autocompleteSuggestions = response.data.autocomplete
        .filter((item: AutocompleteSuggestion) => 
          !['state', 'school', 'school_district'].includes(item.area_type || '')
        )
        .map((item: AutocompleteSuggestion) => ({
          city: item.city,
          state_code: item.state_code,
          postal_code: item.postal_code,
          line: item.line,
          area_type: item.area_type,
          country: item.country
        }));

      setSuggestions(autocompleteSuggestions);
      setShowSuggestions(true);
    } catch (err) {
      console.error('Autocomplete error:', err);
      setSuggestions([]);
    }
  };

  const debouncedAutocomplete = useCallback(
    debounce((input: string) => handleAutocomplete(input), 300),
    []
  );

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAddress(value);
    setSelectedIndex(-1);
    debouncedAutocomplete(value);
  };

  const handleSelectSuggestion = async (suggestion: AutocompleteSuggestion) => {
    if (suggestion.area_type === 'address') {
      try {
        // Hide autocomplete list immediately
        setShowSuggestions(false);

        // 1. First call the search API to find the property_id
        const searchResponse = await axios.get(`${API_URL}/api/properties/search`, {
          params: {
            postal_code: suggestion.postal_code,
            city: suggestion.city,
            state_code: suggestion.state_code
          }
        });

        if (searchResponse.data.properties && searchResponse.data.properties.length > 0) {
          // Function to normalize address for comparison
          const normalizeAddress = (addr: string) => {
            return addr.toLowerCase()
              .replace(/\s+/g, ' ')
              .replace(/,/g, '')
              .trim();
          };

          // Normalize the suggestion address
          const suggestionAddr = suggestion.line 
            ? normalizeAddress(`${suggestion.line} ${suggestion.city} ${suggestion.state_code}`)
            : '';

          // Find the property with the most similar address
          const property = searchResponse.data.properties.find((p: any) => {
            const propertyAddr = normalizeAddress(p.address);
            // Return false if suggestion.line doesn't exist
            if (!suggestion.line) return false;
            // Check if suggestion.line is included in the property address
            return propertyAddr.includes(normalizeAddress(suggestion.line));
          });

          if (property) {
            // 2. Fetch detailed information with property_id
            const detailResponse = await axios.get(`${API_URL}/api/properties/v3/detail`, {
              params: {
                property_id: property.property_id
              }
            });

            if (detailResponse.status === 200) {
              // Navigate to detail page
              router.push(`/property/${property.property_id}`);
            } else {
              console.error('Failed to fetch property details');
            }
          } else {
            // If no exact address match is found, go to search results page
            const searchParams: SearchParams = {
              postal_code: suggestion.postal_code
            };
            const queryString = new URLSearchParams(searchParams as Record<string, string>).toString();
            const fullAddress = `${suggestion.line}, ${suggestion.city}, ${suggestion.state_code}`;
            router.push(`/search?${queryString}&keyword=${encodeURIComponent(fullAddress)}`);
          }
        } else {
          console.error('No properties found in the area');
          // Even if there are no search results, navigate to the search page
          router.push(`/search?keyword=${encodeURIComponent(suggestion.line || '')}`);
        }
      } catch (error) {
        // Hide autocomplete list even if an error occurs
        setShowSuggestions(false);
        if (axios.isAxiosError(error)) {
          console.error('Error fetching property details:', error.response?.data);
        } else {
          console.error('Error fetching property details:', error);
        }
      }
    } else {
      // Existing search API call logic
      const searchParams: SearchParams = {};
      if (suggestion.postal_code) {
        searchParams.postal_code = suggestion.postal_code;
      } else if (suggestion.city && suggestion.state_code) {
        searchParams.city = suggestion.city;
        searchParams.state_code = suggestion.state_code;
      }
      
      const queryString = new URLSearchParams(searchParams as Record<string, string>).toString();
      const fullAddress = suggestion.line 
        ? `${suggestion.line}, ${suggestion.city}, ${suggestion.state_code}`
        : suggestion.city 
          ? `${suggestion.city}, ${suggestion.state_code} ${suggestion.postal_code || ''}`
          : `${suggestion.state_code} ${suggestion.postal_code || ''}`;
      
      router.push(`/search?${queryString}&keyword=${encodeURIComponent(fullAddress)}`);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;
    router.push(`/search?keyword=${encodeURIComponent(address)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSearch(e);
        setShowSuggestions(false);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : -1
        );
        break;
      
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        } else {
          handleSearch(e);
          setShowSuggestions(false);
        }
        setSelectedIndex(-1);
        break;
      
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleBlur = () => {
    blurTimeoutRef.current = setTimeout(() => {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }, 200);
  };

  const handleSuggestionClick = (suggestion: AutocompleteSuggestion) => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    handleSelectSuggestion(suggestion);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Rental Cashlow Pro</title>
        <meta name="description" content="Real estate investment analysis tool" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="min-h-[calc(100vh-20rem)] flex flex-col items-center justify-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">
            Find Your Next Investment Property
          </h1>

          <div className="w-full max-w-2xl relative">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={address}
                onChange={handleAddressChange}
                onFocus={() => setShowSuggestions(true)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                placeholder="Enter an address, city, or ZIP code"
                className="flex-1 p-4 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Search
              </button>
            </form>

            {/* Autocomplete Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 w-full bg-white border-2 border-gray-300 rounded-lg shadow-lg mt-1">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors duration-150 ${
                      index === selectedIndex ? 'bg-blue-100' : 'hover:bg-blue-50'
                    }`}
                  >
                    {suggestion.line 
                      ? `${suggestion.line}, ${suggestion.city}, ${suggestion.state_code} (${suggestion.area_type})`
                      : suggestion.city 
                        ? `${suggestion.city}, ${suggestion.state_code} ${suggestion.postal_code || ''} (${suggestion.area_type})`
                        : `${suggestion.state_code} ${suggestion.postal_code || ''} (${suggestion.area_type})`}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default Home