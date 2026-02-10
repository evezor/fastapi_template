"""
Authentication module for Authentik OAuth2/OIDC integration

This module provides:
- OAuth2 Authorization Code Flow with Authentik
- JWT token validation using JWKS
- FastAPI dependencies for protected routes
- Role-based access control (RBAC)
"""

from .config import AuthentikSettings
from .models import TokenResponse, UserInfo, TokenData
from .oauth import AuthentikOAuth
from .dependencies import get_current_user, get_current_user_from_cookie, require_group, verify_token
from .jwks import AuthentikJWKSClient, get_jwks_client

__all__ = [
    "AuthentikSettings",
    "TokenResponse",
    "UserInfo",
    "TokenData",
    "AuthentikOAuth",
    "get_current_user",
    "get_current_user_from_cookie",
    "require_group",
    "verify_token",
    "AuthentikJWKSClient",
    "get_jwks_client",
]
