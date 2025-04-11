# tests/conftest.py
import pytest
import os
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.users import User
from app.auth.utils import get_password_hash
from app.config import settings

# Database URL for testing
TEST_DATABASE_URL = "sqlite:///./test.db"

# Create test engine
engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Set up test DB session
@pytest.fixture(scope="function")
def db():
    # Create test DB tables
    Base.metadata.create_all(bind=engine)
    
    # Create test session
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        # Reset DB after test (can be omitted for in-memory DB)
        Base.metadata.drop_all(bind=engine)

# FastAPI test client
@pytest.fixture(scope="function")
def client(db):
    # Override dependencies for testing
    def override_get_db():
        try:
            yield db
        finally:
            db.close()
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    # Reset dependencies after test
    app.dependency_overrides = {}

# Test token
@pytest.fixture(scope="function")
def test_token(db):
    from app.auth.utils import create_access_token
    
    # Create test user
    test_user = User(
        email="test@example.com",
        password=get_password_hash("password123"),
        username="Test User"
    )
    db.add(test_user)
    db.commit()
    db.refresh(test_user)
    
    # Generate token for test user
    access_token = create_access_token(
        data={"sub": test_user.email}
    )
    
    return access_token

# Mock external API
@pytest.fixture(scope="function")
def mock_realty_api(monkeypatch):
    # Sample property data
    sample_property = {
        "property_id": "test-property-1",
        "address": "123 Test St, Test City, TS",
        "price": "$500,000",
        "bedrooms": 3,
        "bathrooms": 2,
        "square_feet": 1500,
        "property_type": "single_family",
        "location": {
            "address": {
                "coordinate": {"lat": 40.123, "lon": -73.456}
            }
        }
    }

    # Property detail data
    property_detail = {
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

    # Mock RealtyInTheUS class methods
    class MockRealtyInTheUS:
        async def search_properties(self, postal_code=None, city=None, state_code=None):
            return {"properties": [sample_property]}
        
        async def get_property_detail(self, property_id):
            return property_detail
        
        async def autocomplete_location(self, input, limit=10):
            return {
                "meta": {"status": 200},
                "autocomplete": [
                    {
                        "city": "Test City",
                        "state_code": "TS",
                        "postal_code": "12345",
                        "area_type": "postal_code",
                        "country": "USA"
                    }
                ]
            }

    # Replace app's actual realty_client with the mocked version
    monkeypatch.setattr("app.main.realty_client", MockRealtyInTheUS())
    
    return {
        "sample_property": sample_property,
        "property_detail": property_detail
    }