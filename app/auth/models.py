from pydantic import BaseModel
from typing import List, Optional

class TokenResponse(BaseModel):
    """OAuth2 token response from Authentik"""
    access_token: str
    token_type: str
    expires_in: int
    refresh_token: Optional[str] = None
    scope: str

class UserInfo(BaseModel):
    """User information from Authentik userinfo endpoint"""
    sub: str  # User UUID
    email: str
    name: str
    preferred_username: str
    groups: List[str] = []

class TokenData(BaseModel):
    """Decoded JWT token data"""
    sub: str  # User UUID (subject)
    email: Optional[str] = None
    name: Optional[str] = None
    preferred_username: Optional[str] = None
    groups: List[str] = []
    exp: int  # Expiration timestamp
    iat: int  # Issued at timestamp
