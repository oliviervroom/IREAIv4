# tests/test_api.py
import pytest
from fastapi import status

def test_root(client):
    """Test for Root endpoint"""
    response = client.get("/")
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"message": "Real Estate Analysis API"}

def test_search_property(client, mock_realty_api):
    """Test for property search API"""
    # Search by postal code
    response = client.get("/api/properties/search?postal_code=12345")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "properties" in data
    assert len(data["properties"]) > 0
    
    # Search by city and state code
    response = client.get("/api/properties/search?city=Test%20City&state_code=TS")
    assert response.status_code == status.HTTP_200_OK
    
    # Test for missing required parameters
    response = client.get("/api/properties/search")
    assert response.status_code == status.HTTP_400_BAD_REQUEST

def test_property_detail(client, mock_realty_api):
    """Test for property detail API"""
    response = client.get("/api/properties/v3/detail?property_id=test-property-1")
    assert response.status_code == status.HTTP_200_OK
    
    # Validate response structure
    data = response.json()
    assert "data" in data
    assert "home" in data["data"]
    
    # Test for empty property ID
    response = client.get("/api/properties/v3/detail?property_id=")
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

def test_autocomplete_location(client, mock_realty_api):
    """Test for location autocomplete API"""
    response = client.get("/api/locations/v2/auto-complete?input=Test")
    assert response.status_code == status.HTTP_200_OK
    
    data = response.json()
    assert "autocomplete" in data
    assert len(data["autocomplete"]) > 0
    
    # Test for missing parameters
    response = client.get("/api/locations/v2/auto-complete")
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

def test_search_cashflow(client, mock_realty_api):
    """Test for cashflow search API"""
    response = client.get("/api/properties/search-cashflow?postal_code=12345")
    assert response.status_code == status.HTTP_200_OK
    
    data = response.json()
    assert "properties" in data
    assert len(data["properties"]) > 0
    
    # Check first property
    property_data = data["properties"][0]
    assert "cashflow_per_unit" in property_data
    assert "calculated_data" in property_data
    assert "api_data" in property_data
    assert "user_inputs" in property_data
    
    # Check calculated values
    assert "Annual Profit or Loss" in property_data["calculated_data"]
    assert "Total Monthly Profit or Loss" in property_data["calculated_data"]
    assert "Cashflow per Unit per Month" in property_data["calculated_data"]

def test_search_cashflow_by_property_id(client, mock_realty_api):
    """Test for cashflow API by property ID"""
    response = client.get("/api/properties/search-cashflow-by-property-id?property_id=test-property-1")
    assert response.status_code == status.HTTP_200_OK
    
    data = response.json()
    assert "properties" in data
    assert len(data["properties"]) == 1
    
    property_data = data["properties"][0]
    assert property_data["property_id"] == "test-property-1"
    assert "cashflow_per_unit" in property_data
    
    # Validate calculated data
    calculated_data = property_data["calculated_data"]
    assert "Net Operating Income" in calculated_data