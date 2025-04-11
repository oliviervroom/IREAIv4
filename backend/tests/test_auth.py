import pytest
from fastapi import status
from sqlalchemy.orm import Session

from app.auth.utils import verify_password, create_access_token, get_password_hash
from app.models.users import User

def test_password_hashing():
    """Test for password hashing and verification"""
    password = "test_password123"
    hashed = get_password_hash(password)
    
    # Check that the hash is different from the original password
    assert hashed != password
    
    # Test password verification function
    assert verify_password(password, hashed) == True
    assert verify_password("wrong_password", hashed) == False

def test_token_creation():
    """Test for JWT token creation"""
    test_data = {"sub": "test@example.com"}
    token = create_access_token(data=test_data)
    
    # Verify token is a string
    assert isinstance(token, str)
    assert len(token) > 0

@pytest.fixture
def test_user(db: Session):
    """Create test user"""
    hashed_password = get_password_hash("password123")
    user = User(
        email="testuser@example.com",
        password=hashed_password,
        username="Test User"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

class TestAuthAPI:
    """Test for authentication related APIs"""
    
    def test_signup(self, client, db):
        """Test for signup API"""
        user_data = {
            "email": "newuser@example.com",
            "password": "password123",
            "name": "New User"
        }
        
        response = client.post("/api/signup", json=user_data)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json() == {"message": "User created successfully"}
        
        # Check if user was created in the database
        user = db.query(User).filter(User.email == user_data["email"]).first()
        assert user is not None
        assert user.email == user_data["email"]
        assert user.username == user_data["name"]
        
        # Try signing up with the same email (duplicate check)
        response = client.post("/api/signup", json=user_data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already registered" in response.json()["detail"].lower()
        
        # Try signing up with invalid email format
        invalid_data = user_data.copy()
        invalid_data["email"] = "invalid-email"
        response = client.post("/api/signup", json=invalid_data)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_login(self, client, test_user):
        """Test for login API"""
        # Try with correct login information
        login_data = {
            "email": "testuser@example.com",
            "password": "password123"
        }
        
        response = client.post("/api/login", json=login_data)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
        assert len(data["access_token"]) > 0
        
        # Try login with wrong password
        wrong_password = login_data.copy()
        wrong_password["password"] = "wrong_password"
        response = client.post("/api/login", json=wrong_password)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "incorrect email or password" in response.json()["detail"].lower()
        
        # Try login with non-existent email
        wrong_email = login_data.copy()
        wrong_email["email"] = "nonexistent@example.com"
        response = client.post("/api/login", json=wrong_email)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "incorrect email or password" in response.json()["detail"].lower()

    def test_protected_endpoint(self, client, test_user):
        """Test for protected endpoints"""
        # First login to get token
        login_data = {
            "email": "testuser@example.com",
            "password": "password123"
        }
        login_response = client.post("/api/login", json=login_data)
        token = login_response.json()["access_token"]
        
        # Create protected endpoint (for testing purposes)
        # (Actual application should have protected endpoints)
        
        # Access without authentication
        response = client.get("/api/user/me")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        
        # Access with valid token
        headers = {"Authorization": f"Bearer {token}"}
        response = client.get("/api/user/me", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        
        user_data = response.json()
        assert user_data["email"] == "testuser@example.com"
        assert "password" not in user_data  # Password should not be included in response
        
        # Access with invalid token
        headers = {"Authorization": "Bearer invalid_token"}
        response = client.get("/api/user/me", headers=headers)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_token_validation(self, client, test_user):
        """Test for token validation"""
        # Create valid token
        token = create_access_token(data={"sub": test_user.email})
        
        # Testing expired tokens is complex due to time dependency
        # Token expiration tests should be implemented in actual application
        
        # Token format validation
        # Correct format: Bearer token
        headers = {"Authorization": f"Bearer {token}"}
        response = client.get("/api/user/me", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        
        # Incorrect format: No Bearer prefix
        headers = {"Authorization": token}
        response = client.get("/api/user/me", headers=headers)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        
        # Incorrect format: Wrong prefix
        headers = {"Authorization": f"Token {token}"}
        response = client.get("/api/user/me", headers=headers)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_user_me_endpoint(self, client, test_user):
        """Test for current user info endpoint"""
        # Login to get token
        login_data = {
            "email": "testuser@example.com",
            "password": "password123"
        }
        login_response = client.post("/api/login", json=login_data)
        token = login_response.json()["access_token"]
        
        # Get user information
        headers = {"Authorization": f"Bearer {token}"}
        response = client.get("/api/user/me", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        
        user_data = response.json()
        assert user_data["email"] == test_user.email
        assert user_data["username"] == test_user.username
        assert "id" in user_data
        assert "password" not in user_data
