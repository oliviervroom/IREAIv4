from fastapi import Depends, Request
from fastapi.security import OAuth2PasswordBearer
from fastapi.security.utils import get_authorization_scheme_param
from jose import jwt
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.users import User
from ..config import settings
from ..exceptions import UnauthorizedException
from typing import Optional
import logging

logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Optional OAuth2 scheme for non-authenticated endpoints
class OAuth2PasswordBearerOptional(OAuth2PasswordBearer):
    async def __call__(self, request: Request) -> Optional[str]:
        authorization: str = request.headers.get("Authorization")
        if not authorization:
            return None
            
        scheme, param = get_authorization_scheme_param(authorization)
        if not authorization or scheme.lower() != "bearer":
            return None
            
        return param

# Create instance of optional OAuth2 scheme
oauth2_scheme_optional = OAuth2PasswordBearerOptional(tokenUrl="token")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise UnauthorizedException()
    except jwt.JWTError:
        raise UnauthorizedException()
        
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise UnauthorizedException()
        
    return user

async def get_current_user_optional(
    token: Optional[str] = Depends(oauth2_scheme_optional),
    db: Session = Depends(get_db)
) -> Optional[User]:
    
    logger.info(f"Token: {token}")
    logger.info(f"DB: {db}")
    
    if not token:
        return None
        
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
            
        user = db.query(User).filter(User.email == email).first()
        logger.info(f"User: {user}")
        return user
    except jwt.JWTError:
        return None