# tests/test_external_api.py
import pytest
import os
from unittest.mock import patch, MagicMock
from fastapi import HTTPException

from app.external_api.realty_in_the_us import RealtyInTheUS

class TestRealtyInTheUS:
    """Test for Realty In The US API client"""
    
    @pytest.fixture
    def setup_env(self, monkeypatch):
        """Set up environment variables and prepare test API responses"""
        monkeypatch.setenv("REALTY_API_KEY", "test_api_key")
        
        self.sample_property = {
            "property_id": "test-property-1",
            "location": {
                "address": {
                    "line": "123 Test St",
                    "city": "Test City",
                    "state": "TS",
                    "coordinate": {"lat": 40.123, "lon": -73.456}
                }
            },
            "list_price": 500000,
            "description": {
                "beds": 3,
                "baths": 2,
                "sqft": 1500,
                "type": "single_family"
            },
            "last_sold_date": "2022-01-01"
        }
        
        self.properties_response = {
            "data": {
                "home_search": {
                    "results": [self.sample_property]
                }
            }
        }
        
        self.property_detail_response = {
            "data": {
                "home": {
                    "property_id": "test-property-1",
                    "list_price": 500000,
                    "description": {
                        "beds": 3,
                        "baths": 2,
                        "sqft": 1500,
                        "units": 1,
                        "type": "single_family"
                    },
                    "tax_history": [{"tax": 5000}],
                    "hoa": {"fee": 200},
                    "location": {
                        "address": {
                            "line": "123 Test St",
                            "city": "Test City",
                            "state": "TS",
                            "coordinate": {"lat": 40.123, "lon": -73.456}
                        }
                    }
                }
            }
        }
        
        self.autocomplete_response = {
            "autocomplete": [
                {
                    "city": "Test City",
                    "state_code": "TS",
                    "postal_code": "12345",
                    "area_type": "postal_code",
                    "country": "USA"
                }
            ],
            "meta": {"status": 200}
        }
    
    @patch("app.external_api.realty_in_the_us.requests.post")
    async def test_search_properties(self, mock_post, setup_env):
        """Test for property search"""
        # Set up mock response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = self.properties_response
        mock_post.return_value = mock_response
        
        client = RealtyInTheUS()
        result = await client.search_properties(postal_code="12345")
        
        # Verify API call
        mock_post.assert_called_once()
        assert "12345" in str(mock_post.call_args)
        
        # Validate result format
        assert "properties" in result
        assert len(result["properties"]) == 1
        assert result["properties"][0]["property_id"] == "test-property-1"
        
        # Test invalid response
        mock_response.status_code = 400
        mock_response.text = "Bad Request"
        
        with pytest.raises(HTTPException) as excinfo:
            await client.search_properties(postal_code="12345")
        assert excinfo.value.status_code == 400
    
    @patch("app.external_api.realty_in_the_us.requests.get")
    async def test_get_property_detail(self, mock_get, setup_env):
        """Test for property detail retrieval"""
        # Set up mock response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = self.property_detail_response
        mock_get.return_value = mock_response
        
        client = RealtyInTheUS()
        result = await client.get_property_detail("test-property-1")
        
        # Verify API call
        mock_get.assert_called_once()
        assert "test-property-1" in str(mock_get.call_args)
        
        # Validate result format
        assert "data" in result
        assert "home" in result["data"]
        assert result["data"]["home"]["property_id"] == "test-property-1"
        
        # Test empty property ID
        with pytest.raises(HTTPException) as excinfo:
            await client.get_property_detail("")
        assert excinfo.value.status_code == 422
    
    @patch("app.external_api.realty_in_the_us.requests.get")
    async def test_autocomplete_location(self, mock_get, setup_env):
        """Test for location autocomplete"""
        # Set up mock response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = self.autocomplete_response
        mock_get.return_value = mock_response
        
        client = RealtyInTheUS()
        result = await client.autocomplete_location("Test")
        
        # Verify API call
        mock_get.assert_called_once()
        assert "Test" in str(mock_get.call_args)
        
        # Validate result format
        assert "autocomplete" in result
        assert len(result["autocomplete"]) == 1
        assert result["autocomplete"][0]["city"] == "Test City"