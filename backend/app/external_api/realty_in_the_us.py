import os
import requests
import logging
from typing import Dict, Optional, List
from fastapi import HTTPException
from .client import APIClient

logger = logging.getLogger(__name__)

class RealtyInTheUS(APIClient):
    """Realty in the US API client"""
    
    def __init__(self):
        self.api_key = os.getenv('REALTY_API_KEY')
        if not self.api_key:
            logger.error("REALTY_API_KEY not found in environment variables")
            raise ValueError("API key not configured")
        
        self.host = "realty-in-us.p.rapidapi.com"
        self.base_headers = {
            'X-RapidAPI-Key': self.api_key,
            'X-RapidAPI-Host': self.host,
            'Content-Type': "application/json"
        }
    
    async def search_properties(self, postal_code: Optional[str] = None, 
                               city: Optional[str] = None, 
                               state_code: Optional[str] = None) -> Dict:
        """
        Search for properties by postal code, city, and state code
        """
        try:
            url = "https://realty-in-us.p.rapidapi.com/properties/v3/list"
            
            # Prepare request payload
            payload = {
                "limit": 10,
                "offset": 0,
                "status": ["for_sale", "ready_to_build"],
                "sort": {
                    "direction": "desc",
                    "field": "list_date"
                }
            }

            # Add search parameters based on what's provided
            if postal_code:
                payload["postal_code"] = postal_code
            elif city and state_code:
                payload["city"] = city
                payload["state_code"] = state_code
            else:
                raise HTTPException(status_code=400, detail="Either postal_code or both city and state_code must be provided")
            
            logger.info(f"Making request to RapidAPI with postal code: {postal_code}, city: {city}, state_code: {state_code}")
            
            # Make API request
            response = requests.post(url, json=payload, headers=self.base_headers)
            
            # Check for successful response
            if response.status_code != 200:
                logger.error(f"RapidAPI error: {response.text}")
                raise HTTPException(
                    status_code=response.status_code, 
                    detail=f"Error from external API: {response.text}"
                )

            data = response.json()

            # Process API response data
            if 'data' in data and 'home_search' in data['data']:
                properties = data['data']['home_search'].get('results', [])
                
                if not properties:
                    return {"properties": []}

                # Extract and format relevant property information
                formatted_properties = []
                for prop in properties:
                    try:
                        location = prop.get('location', {})
                        address = location.get('address', {})
                        description = prop.get('description', {})
                        
                        # Create formatted property object with coordinates
                        formatted_prop = {
                            "property_id": prop.get('property_id', ''),
                            "address": f"{address.get('line', '')} {address.get('city', '')}, {address.get('state', '')}",
                            "price": f"${prop.get('list_price', 0):,}",
                            "bedrooms": description.get('beds', 0),
                            "bathrooms": description.get('baths', 0),
                            "square_feet": description.get('sqft', 0),
                            "property_type": description.get('type', 'N/A'),
                            "last_sold_date": prop.get('last_sold_date', 'N/A'),
                            "location": {
                                "address": {
                                    "coordinate": address.get('coordinate', {})
                                }
                            }
                        }
                        
                        formatted_properties.append(formatted_prop)
                    except Exception as e:
                        logger.error(f"Error formatting property: {e}")
                        continue
                
                return {"properties": formatted_properties}
            else:
                logger.warning("No properties found in response")
                return {"properties": []}

        except Exception as e:
            logger.error(f"Unexpected error in search_properties: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def get_property_detail(self, property_id: str) -> Dict:
        """
        Retrieve detailed information for a specific property ID
        """
        try:
            if not property_id:
                logger.error("No property_id provided")
                raise HTTPException(
                    status_code=422,
                    detail="Property ID is required"
                )

            url = "https://realty-in-us.p.rapidapi.com/properties/v3/detail"
            
            params = {
                'property_id': property_id
            }

            logger.info(f"Making request to RapidAPI with params: {params}")
            response = requests.get(url, headers=self.base_headers, params=params)
            
            if response.status_code != 200:
                logger.error(f"RapidAPI error: {response.text}")
                raise HTTPException(
                    status_code=response.status_code, 
                    detail=f"Error from external API: {response.text}"
                )

            logger.info("Successfully retrieved property details")
            return response.json()

        except Exception as e:
            logger.error(f"Unexpected error in get_property_detail: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def autocomplete_location(self, input: str, limit: int = 10) -> Dict:
        """
        Retrieve location autocomplete suggestions
        """
        try:
            url = "https://realty-in-us.p.rapidapi.com/locations/v2/auto-complete"
            
            params = {
                'input': input,
                'limit': limit
            }

            logger.info(f"Making autocomplete request to RapidAPI with input: {input}")
            
            response = requests.get(url, headers=self.base_headers, params=params)
            
            if response.status_code != 200:
                logger.error(f"RapidAPI error: {response.text}")
                raise HTTPException(
                    status_code=response.status_code, 
                    detail=f"Error from external API: {response.text}"
                )

            data = response.json()
            
            # Format the response to match the expected structure
            formatted_suggestions = []
            if 'autocomplete' in data:
                for item in data['autocomplete']:
                    suggestion = {
                        'city': item.get('city'),
                        'state_code': item.get('state_code'),
                        'postal_code': item.get('postal_code'),
                        'area_type': item.get('area_type'),
                        'country': item.get('country')
                    }
                    # Only add line field if it exists
                    if 'line' in item:
                        suggestion['line'] = item['line']
                    formatted_suggestions.append(suggestion)

            return {
                "meta": data.get('meta', {}),
                "autocomplete": formatted_suggestions
            }

        except Exception as e:
            logger.error(f"Unexpected error in autocomplete_location: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e)) 