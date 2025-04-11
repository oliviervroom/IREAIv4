from abc import ABC, abstractmethod
import httpx
from typing import Dict, Optional

class APIClient(ABC):
    """Base class for API clients"""
    
    @abstractmethod
    def __init__(self):
        """Initialize API client"""
        pass
    
    @abstractmethod
    async def search_properties(self, postal_code: Optional[str] = None, 
                               city: Optional[str] = None, 
                               state_code: Optional[str] = None) -> Dict:
        """Method for searching properties"""
        pass
    
    @abstractmethod
    async def get_property_detail(self, property_id: str) -> Dict:
        """Method for retrieving property details"""
        pass 