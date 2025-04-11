from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = Field(
        default="postgresql://user:password@localhost/dbname",
        description="Database connection string"
    )
    
    # JWT
    SECRET_KEY: str = Field(
        default="real_estate_random_secret_key", 
        description="Secret key for JWT token encryption"
    )
    ALGORITHM: str = Field(
        default="HS256", 
        description="Algorithm used for JWT token"
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=30, 
        description="Minutes until JWT token expires"
    )
    
    # API Keys
    REALTY_API_KEY: str = Field(
        default="", 
        description="API key for Realty in the US API"
    )
    ZILLOW_API_KEY: str = Field(
        default="", 
        description="API key for Zillow API"
    )
    GOOGLE_MAPS_API_KEY: str = Field(
        default="", 
        description="API key for Google Maps API"
    )
    
    # Environment
    ENVIRONMENT: str = Field(
        default="development",
        description="Application environment (development, testing, production)"
    )
    
    # CORS
    CORS_ORIGINS: list[str] = Field(
        default=["*"],
        description="List of allowed origins for CORS"
    )
    
    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
        "case_sensitive": True
    }

    def is_development(self) -> bool:
        return self.ENVIRONMENT.lower() == "development"
    
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"
    
    def is_testing(self) -> bool:
        return self.ENVIRONMENT.lower() == "testing"


# Create global settings object
settings = Settings() 