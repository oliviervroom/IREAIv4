import { NextPage } from 'next';
import Head from 'next/head';
import { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import debounce from 'lodash/debounce';
import { useRouter } from 'next/router';
import { useLoadScript, GoogleMap, Marker, Data } from '@react-google-maps/api';
import Navigation from '../../components/Navigation'

// Define property data interface
interface PropertyData {
  property_id: string;
  address: string;
  price: string;
  bedrooms: number;
  bathrooms: number;
  square_feet: number;
  property_type: string;
  last_sold_date: string;
  cashflow_per_unit: number;
  location: {
    address: {
      coordinate: {
        lat: number;
        lon: number;
      }
    }
  };
}

// Update AutocompleteSuggestion interface
interface AutocompleteSuggestion {
  city?: string;
  state_code?: string;
  postal_code?: string;
  line?: string;
  area_type?: string;
  country?: string;
}

// Add interface for API response
interface AutocompleteResponse {
  city?: string;
  state_code?: string;
  postal_code?: string;
  line?: string;
  area_type?: string;
  country?: string;
}

// Add new interface for search parameters
interface SearchParams {
  postal_code?: string;
  city?: string;
  state_code?: string;
}

// Add new interfaces
interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

// Add new interface for Google Maps libraries
interface MarkerLibrary {
  AdvancedMarkerElement: any;
}

// EC2 instance API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error('API_URL is not defined');
}

// Define libraries array outside component
const GOOGLE_MAPS_LIBRARIES: ("places" | "geometry" | "drawing")[] = ["places", "geometry", "drawing"];

const SearchProperty: NextPage = () => {
  // Add state for client-side rendering check
  const [isClient, setIsClient] = useState(false);

  // Initialize states without sessionStorage
  const [properties, setProperties] = useState<PropertyData[]>([]);
  const [address, setAddress] = useState('');
  const [mapCenter, setMapCenter] = useState({ lat: 37.0902, lng: -95.7129 });
  const [mapZoom, setMapZoom] = useState(4);
  const [boundaryInfo, setBoundaryInfo] = useState<any>(null);

  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Add new state for keyboard navigation
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  // Add blur timeout ref to handle click events properly
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const router = useRouter();

  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [boundary, setBoundary] = useState<google.maps.Data.Feature | null>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [boundaryLayer, setBoundaryLayer] = useState<google.maps.Data | null>(null);

  // Add ref for advanced markers
  const markersRef = useRef<any[]>([]);

  // Add state for tracking if this is a back navigation
  const [isBackNavigation, setIsBackNavigation] = useState(false);

  // Update Google Maps loading with marker library and Map ID
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  // Check if environment variables are properly set
  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    console.error('Google Maps API key is not defined');
  }

  // Add useEffect to load stored data after component mounts
  useEffect(() => {
    setIsClient(true);
    
    // Load stored data from sessionStorage
    const storedProperties = sessionStorage.getItem('searchProperties');
    const storedAddress = sessionStorage.getItem('searchAddress');
    const storedCenter = sessionStorage.getItem('mapCenter');
    const storedZoom = sessionStorage.getItem('mapZoom');
    const storedBoundary = sessionStorage.getItem('boundaryInfo');

    if (storedProperties) {
      setProperties(JSON.parse(storedProperties));
    }
    if (storedAddress) {
      setAddress(storedAddress);
    }
    if (storedCenter) {
      setMapCenter(JSON.parse(storedCenter));
    }
    if (storedZoom) {
      setMapZoom(parseInt(storedZoom));
    }
    if (storedBoundary) {
      setBoundaryInfo(JSON.parse(storedBoundary));
    }
  }, []);

  // Add useEffect to handle URL parameters
  useEffect(() => {
    const { keyword, postal_code, city, state_code } = router.query;
    
    // Set the search input value if keyword exists
    if (typeof keyword === 'string') {
      setAddress(decodeURIComponent(keyword));
    }
    
    // Perform search if we have search parameters
    if (postal_code || (city && state_code)) {
      const searchParams: SearchParams = {};
      if (typeof postal_code === 'string') {
        searchParams.postal_code = postal_code;
      } else if (typeof city === 'string' && typeof state_code === 'string') {
        searchParams.city = city;
        searchParams.state_code = state_code;
      }
      handleSearch(searchParams);
    } else if (typeof keyword === 'string') {
      handleSearch();
    }
  }, [router.query]); // Only run when URL parameters change

  // Add effect to detect back navigation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', () => {
        setIsBackNavigation(true);
      });
    }
  }, []);

  // Add debounced function for autocomplete
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

      console.log('Autocomplete response:', response.data);

      // Filter out suggestions with area_type 'state', 'school', and 'school_district'
      const autocompleteSuggestions = response.data.autocomplete
        .filter((item: AutocompleteResponse) => 
          !['state', 'school', 'school_district'].includes(item.area_type || '')
        )
        .map((item: AutocompleteResponse) => ({
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

  // Fix useCallback with debounce
  const debouncedAutocomplete = useCallback(
    debounce((input: string) => handleAutocomplete(input), 300),
    []
  );

  // Update address input handler
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAddress(value);
    setSelectedIndex(-1); // Reset selection when input changes
    debouncedAutocomplete(value);
  };

  // Add function to clear previous boundary
  const clearBoundary = () => {
    if (boundaryLayer) {
      boundaryLayer.setMap(null);
      setBoundaryLayer(null);
    }
  };

  // Update handleMapChange to include boundary info
  const handleMapChange = () => {
    if (!mapInstance) return;
    
    const center = mapInstance.getCenter();
    const zoom = mapInstance.getZoom();
    
    if (center && zoom) {
      const newCenter = { lat: center.lat(), lng: center.lng() };
      sessionStorage.setItem('mapCenter', JSON.stringify(newCenter));
      sessionStorage.setItem('mapZoom', zoom.toString());
      
      // Store boundary info if exists
      if (boundaryInfo) {
        sessionStorage.setItem('boundaryInfo', JSON.stringify(boundaryInfo));
      }
      
      setMapCenter(newCenter);
      setMapZoom(zoom);
    }
  };

  // Update fetchAndDisplayBoundary
  const fetchAndDisplayBoundary = async (city: string, stateCode: string) => {
    if (!mapInstance) return;

    try {
      // Clear any existing boundary
      clearBoundary();

      // Create new Data Layer
      const dataLayer = new google.maps.Data({ map: mapInstance });

      // Fetch boundary data from OpenStreetMap Nominatim
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `city=${encodeURIComponent(city)}` +
        `&state=${encodeURIComponent(stateCode)}` +
        `&country=USA` +
        `&format=geojson` +
        `&polygon_geojson=1`
      );

      const data = await response.json();

      if (data.features && data.features.length > 0) {
        // Add GeoJSON to the data layer
        dataLayer.addGeoJson(data);

        // Style the boundary
        dataLayer.setStyle({
          fillColor: '#2196F3',
          fillOpacity: 0.1,
          strokeColor: '#2196F3',
          strokeWeight: 2,
        });

        setBoundaryLayer(dataLayer);
        
        // Store boundary info
        setBoundaryInfo({
          city,
          stateCode,
          geoJson: data
        });
      }
    } catch (error) {
      console.error('Error fetching boundary:', error);
    }
  };

  // Add useEffect to restore boundary on mount
  useEffect(() => {
    if (mapInstance && boundaryInfo) {
      const { city, stateCode } = boundaryInfo;
      fetchAndDisplayBoundary(city, stateCode);
    }
  }, [mapInstance]);

  // Update handleSearch to check login status and use the appropriate endpoint
  const handleSearch = async (searchParams?: SearchParams) => {
    // If this is a back navigation and we have cached data, use it
    if (isBackNavigation && sessionStorage.getItem('searchProperties')) {
      setIsBackNavigation(false);
      return;
    }

    if (!searchParams && !address.trim()) {
      setError('Please enter an address');
      return;
    }

    setIsLoading(true);
    setError('');
    setProperties([]); // Clear previous results

    try {
      // Get authentication token if it exists
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Always use search-cashflow endpoint regardless of login status
      const endpoint = `${API_URL}/api/properties/search-cashflow`;

      console.log('Request URL:', endpoint);

      const response = await axios.get(endpoint, {
        params: searchParams || { postal_code: address },
        headers: headers
      });
      
      console.log('Search response with cashflow:', response.data);

      if (response.data.properties && response.data.properties.length > 0) {
        // Store the properties in state and sessionStorage
        setProperties(response.data.properties);
        sessionStorage.setItem('searchProperties', JSON.stringify(response.data.properties));
        sessionStorage.setItem('searchAddress', address);
        
        // Update map bounds based on properties
        if (mapInstance) {
          const bounds = new google.maps.LatLngBounds();
          let hasValidCoordinates = false;

          response.data.properties.forEach((property: PropertyData) => {
            const coordinates = property.location?.address?.coordinate;
            if (coordinates?.lat && coordinates?.lon) {
              bounds.extend({ 
                lat: coordinates.lat, 
                lng: coordinates.lon
              });
              hasValidCoordinates = true;
            }
          });
          
          if (hasValidCoordinates) {
            mapInstance.fitBounds(bounds);
            
            const listener = google.maps.event.addListener(mapInstance, 'idle', () => {
              const zoom = mapInstance?.getZoom();
              if (zoom && zoom > 15) {
                mapInstance.setZoom(15);
              }
              google.maps.event.removeListener(listener);
            });
          }
        }
      } else {
        setError('No properties found for this location');
      }
    } catch (err) {
      console.error('Search error:', err);
      if (axios.isAxiosError(err)) {
        // If authentication error occurs, retry with unauthenticated endpoint
        if (err.response?.status === 401) {
          try {
            const responsePublic = await axios.get(`${API_URL}/api/properties/search-cashflow`, {
              params: searchParams || { postal_code: address }
            });
            
            if (responsePublic.data.properties && responsePublic.data.properties.length > 0) {
              setProperties(responsePublic.data.properties);
              sessionStorage.setItem('searchProperties', JSON.stringify(responsePublic.data.properties));
              sessionStorage.setItem('searchAddress', address);
              
              // Update map bounds based on properties
              if (mapInstance) {
                const bounds = new google.maps.LatLngBounds();
                let hasValidCoordinates = false;

                responsePublic.data.properties.forEach((property: PropertyData) => {
                  const coordinates = property.location?.address?.coordinate;
                  if (coordinates?.lat && coordinates?.lon) {
                    bounds.extend({ 
                      lat: coordinates.lat, 
                      lng: coordinates.lon
                    });
                    hasValidCoordinates = true;
                  }
                });
                
                if (hasValidCoordinates) {
                  mapInstance.fitBounds(bounds);
                  
                  const listener = google.maps.event.addListener(mapInstance, 'idle', () => {
                    const zoom = mapInstance?.getZoom();
                    if (zoom && zoom > 15) {
                      mapInstance.setZoom(15);
                    }
                    google.maps.event.removeListener(listener);
                  });
                }
              }
            } else {
              setError('No properties found for this location');
            }
            
            setIsLoading(false);
            return;
          } catch (publicErr) {
            console.error('Public API error:', publicErr);
          }
        }
        
        setError(err.response?.data?.detail || 'Failed to fetch property data');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Update handleKeyDown to handle arrow keys
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSearch();
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
          handleSearch();
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

  // Add handler for input blur
  const handleBlur = () => {
    // Delay hiding suggestions to allow click events on suggestions to fire
    blurTimeoutRef.current = setTimeout(() => {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }, 200);
  };

  // Update suggestion click handler to clear blur timeout
  const handleSuggestionClick = (suggestion: AutocompleteSuggestion) => {
    // Clear the blur timeout to prevent suggestions from disappearing
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    handleSelectSuggestion(suggestion);
  };

  // Add new handler for property click
  const handlePropertyClick = (property: PropertyData) => {
    console.log('Navigating to property:', property.property_id);
    // Store current map state before navigation
    handleMapChange();
    // Navigate to property detail
    window.location.href = `/property/${property.property_id}`;
  };

  // Add function to create price tag marker
  const createCashflowTag = (cashflowPerUnit: number) => {
    const cashflowTag = document.createElement('div');
    cashflowTag.className = 'cashflow-tag';
    
    // Format the cashflow value
    const formattedCashflow = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    }).format(cashflowPerUnit);
    
    cashflowTag.textContent = formattedCashflow;
    
    // Set background color based on cashflow value
    if (cashflowPerUnit >= 0) {
        cashflowTag.classList.add('positive');
    } else {
        cashflowTag.classList.add('negative');
    }
    
    return cashflowTag;
  };

  // Update renderMap to handle client-side only rendering
  const renderMap = () => {
    if (!isLoaded) return <div>Loading map...</div>;
    if (!isClient) return <div>Loading...</div>;

    return (
      <div className="h-[500px] w-full mb-8">
        <GoogleMap
          mapContainerClassName="w-full h-full"
          center={mapCenter}
          zoom={mapZoom}
          options={{
            mapTypeControl: false,
            streetViewControl: false,
            mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID,
          }}
          onLoad={(map) => {
            setMapInstance(map);
          }}
          onDragEnd={handleMapChange}
          onZoomChanged={handleMapChange}
        />
      </div>
    );
  };

  // Update markers for reference
  const markerMap = useRef<Map<string, any>>(new Map());

  // Update modified marker function
  useEffect(() => {
    const updateMarkers = async () => {
      if (!mapInstance || !isLoaded || properties.length === 0) return;

      // Clear existing markers
      markersRef.current.forEach(marker => marker.map = null);
      markersRef.current = [];
      markerMap.current.clear();

      try {
        const { AdvancedMarkerElement } = await google.maps.importLibrary("marker") as MarkerLibrary;

        properties.forEach((property) => {
          const coordinates = property.location?.address?.coordinate;
          if (coordinates?.lat && coordinates?.lon) {
            const cashflowTag = createCashflowTag(property.cashflow_per_unit);
            const marker = new AdvancedMarkerElement({
              map: mapInstance,
              position: { 
                lat: coordinates.lat, 
                lng: coordinates.lon 
              },
              content: cashflowTag,
              title: property.address,
            });

            marker.addListener('click', () => {
              const element = marker.content as HTMLElement;
              element.style.transform = 'scale(1.1)';
              setTimeout(() => {
                element.style.transform = 'scale(1)';
              }, 200);
              
              handleMapChange();
              handlePropertyClick(property);
            });
            
            markersRef.current.push(marker);
            markerMap.current.set(property.property_id, marker);
          }
        });
      } catch (error) {
        console.error('Error creating markers:', error);
      }
    };

    updateMarkers();
  }, [properties, mapInstance, isLoaded]);

  // Add function to handle marker highlighting
  const handlePropertyHover = (property: PropertyData, isHovering: boolean) => {
    const marker = markerMap.current.get(property.property_id);
    if (marker && marker.content) {
      const element = marker.content as HTMLElement;
      if (isHovering) {
        element.classList.add('highlighted');
      } else {
        element.classList.remove('highlighted');
      }
    }
  };

  // Add cleanup for navigation away from search
  useEffect(() => {
    return () => {
      // Only clear if actually navigating away from the site
      if (!document.hidden && !isBackNavigation) {
        sessionStorage.removeItem('searchProperties');
        sessionStorage.removeItem('searchAddress');
        sessionStorage.removeItem('mapCenter');
        sessionStorage.removeItem('mapZoom');
        sessionStorage.removeItem('boundaryInfo');
      }
    };
  }, [isBackNavigation]);

  // Update handleSelectSuggestion
  const handleSelectSuggestion = async (suggestion: AutocompleteSuggestion) => {
    setIsLoading(true); // Start loading
    
    if (suggestion.area_type === 'city') {
      try {
        setShowSuggestions(false);
        
        // Geocode the city
        const geocoder = new google.maps.Geocoder();
        const geocodeResult = await geocoder.geocode({
          address: `${suggestion.city}, ${suggestion.state_code}`
        });

        if (geocodeResult.results && geocodeResult.results[0]) {
          const location = geocodeResult.results[0].geometry.location;
          const viewport = geocodeResult.results[0].geometry.viewport;

          // Update map position
          setMapCenter({
            lat: location.lat(),
            lng: location.lng()
          });

          if (viewport) {
            setMapBounds({
              north: viewport.getNorthEast().lat(),
              south: viewport.getSouthWest().lat(),
              east: viewport.getNorthEast().lng(),
              west: viewport.getSouthWest().lng(),
            });
          }
          setMapZoom(13);

          // Fetch and display boundary
          if (suggestion.city && suggestion.state_code) {
            await fetchAndDisplayBoundary(suggestion.city, suggestion.state_code);
          }
        }

        // Prepare search parameters
        const searchParams: SearchParams = {
          city: suggestion.city,
          state_code: suggestion.state_code
        };
        
        // Update address display
        const fullAddress = `${suggestion.city}, ${suggestion.state_code} (${suggestion.area_type})`;
        setAddress(fullAddress);
        
        // Perform property search
        await handleSearch(searchParams);
      } catch (error) {
        console.error('Error handling city selection:', error);
        setError('Failed to locate the selected city');
      } finally {
        setIsLoading(false); // End loading
      }
    } else {
      // Clear boundary for non-city searches
      clearBoundary();
      const fullAddress = suggestion.line 
        ? `${suggestion.line}, ${suggestion.city}, ${suggestion.state_code} (${suggestion.area_type})`
        : suggestion.city 
          ? `${suggestion.city}, ${suggestion.state_code} ${suggestion.postal_code || ''} (${suggestion.area_type})`
          : `${suggestion.state_code} ${suggestion.postal_code || ''} (${suggestion.area_type})`;
      
      setAddress(fullAddress);
      setShowSuggestions(false);
      
      // Prepare search parameters based on suggestion type
      const searchParams: SearchParams = {};
      if (suggestion.postal_code) {
        searchParams.postal_code = suggestion.postal_code;
      } else if (suggestion.city && suggestion.state_code) {
        searchParams.city = suggestion.city;
        searchParams.state_code = suggestion.state_code;
      }
      
      handleSearch(searchParams);
    }
  };

  // Function to format prices to K, M units
  const formatPrice = (priceStr: string): string => {
    // Extract only numbers from string
    const num = parseInt(priceStr.replace(/[^0-9]/g, ''));
    
    if (isNaN(num)) return priceStr;
    
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `$${(num / 1000).toFixed(0)}K`;
    } else {
      return `$${num}`;
    }
  };

  // Function to convert property type to two-letter abbreviation
  const formatPropertyType = (type: string): string => {
    const typeMap: { [key: string]: string } = {
      'single_family': 'SF',
      'multi_family': 'MF',
      'condos': 'CD',
      'townhouse': 'TH',
      'apartment': 'AP',
      'duplex': 'DP',
      'triplex': 'TP',
      'quadruplex': 'QP'
    };

    return typeMap[type] || type.substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      <Head>
        <title>Search Property - Real Estate Analysis</title>
        <meta name="description" content="Search for property information" />
      </Head>

      <Navigation />

      {/* 전체 화면 로딩 오버레이 추가 */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white p-5 rounded-lg shadow-lg flex flex-col items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mb-3"></div>
            <p className="text-gray-700">Searching...</p>
          </div>
        </div>
      )}

      <div className="flex-1 flex">
        {/* Left column: Search and Results */}
        <div className="w-1/2 p-8 overflow-y-auto border-r">
          {/* Search Form */}
          <div className="mb-8">
            <div className="relative">
              <div className="flex gap-4">
                <input
                  type="text"
                  value={address}
                  onChange={handleAddressChange}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={handleBlur}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter address, city, or ZIP code"
                  className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => handleSearch()}
                  disabled={isLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
                >
                  Search
                </button>
              </div>

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

          {/* Error Message */}
          {error && (
            <div className="text-red-600 mb-4">
              {error}
            </div>
          )}

          {/* Results Table */}
          {isClient && properties.length > 0 && (
            <div className="overflow-x-hidden">
              <div className="w-full">
                <table className="w-full table-fixed bg-white border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="w-[5%] px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
                      <th className="w-[41%] px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                      <th className="w-[10%] px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      <th className="w-[7%] px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="w-[7%] px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beds</th>
                      <th className="w-[7%] px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Baths</th>
                      <th className="w-[8%] px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area</th>
                      <th className="w-[15%] px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cashflow</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {properties.map((property, index) => (
                      <tr 
                        key={index} 
                        onClick={() => handlePropertyClick(property)}
                        onMouseEnter={() => handlePropertyHover(property, true)}
                        onMouseLeave={() => handlePropertyHover(property, false)}
                        className="hover:bg-gray-50 cursor-pointer"
                      >
                        <td className="px-2 py-2 truncate">{index + 1}</td>
                        <td className="px-2 py-2 truncate" title={property.address}>{property.address}</td>
                        <td className="px-2 py-2 truncate" title={property.price}>
                          {formatPrice(property.price)}
                        </td>
                        <td className="px-2 py-2 truncate" title={property.property_type}>
                          {formatPropertyType(property.property_type)}
                        </td>
                        <td className="px-2 py-2 truncate">{property.bedrooms}</td>
                        <td className="px-2 py-2 truncate">{property.bathrooms}</td>
                        <td className="px-2 py-2 truncate">{property.square_feet}</td>
                        <td className={`px-2 py-2 truncate font-medium ${
                          property.cashflow_per_unit >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            maximumFractionDigits: 0
                          }).format(property.cashflow_per_unit)}
                          <span className="text-gray-500 text-xs ml-1"></span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right column: Map */}
        <div className="w-1/2 flex flex-col">
          {!isLoaded ? (
            <div className="w-full h-[calc(100vh-64px)] flex items-center justify-center bg-gray-100">
              <div className="text-gray-500">Loading map...</div>
            </div>
          ) : (
            <div className="flex-1">
              <GoogleMap
                mapContainerClassName="w-full h-[calc(100vh-64px)]"
                center={mapCenter}
                zoom={mapZoom}
                options={{
                  mapTypeControl: false,
                  streetViewControl: false,
                  mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID,
                  fullscreenControl: false,
                }}
                onLoad={(map) => {
                  setMapInstance(map);
                }}
                onDragEnd={handleMapChange}
                onZoomChanged={handleMapChange}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Add marker highlight styles
const markerStyles = `
.cashflow-tag {
  border-radius: 8px;
  color: white;
  font-size: 14px;
  font-weight: bold;
  padding: 8px 12px;
  position: relative;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  transform-origin: bottom center;
  transition: transform 0.2s ease, background-color 0.2s ease;
  z-index: 1;
}

.cashflow-tag.highlighted {
  transform: scale(1.1);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4);
  z-index: 2;
}

.cashflow-tag.positive {
  background-color: #4CAF50;
}

.cashflow-tag.negative {
  background-color: #FF5252;
}

.cashflow-tag::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 100%;
  transform: translateX(-50%);
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid currentColor;
}

.cashflow-tag.positive::after {
  border-top-color: #4CAF50;
}

.cashflow-tag.negative::after {
  border-top-color: #FF5252;
}

.cashflow-tag:hover {
  transform: scale(1.05);
  z-index: 1;
}
`;

// Update style injection
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = markerStyles;
  document.head.appendChild(style);
}

export default SearchProperty; 