from fastapi import Depends, HTTPException, status, Cookie
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from jwt.exceptions import InvalidTokenError, ExpiredSignatureError, InvalidAudienceError
from typing import List, Optional
from .jwks import get_jwks_client
from .config import AuthentikSettings
from .models import TokenData

# HTTP Bearer token security scheme
security = HTTPBearer()

# Global settings instance
settings = AuthentikSettings()

async def verify_token(token: str) -> TokenData:
    """
    Verify JWT token using Authentik's public key from JWKS

    Args:
        token: JWT token string

    Returns:
        TokenData with decoded claims

    Raises:
        HTTPException: If token is invalid, expired, or verification fails
    """
    try:
        # Get JWKS client (singleton, handles caching)
        jwks_client = get_jwks_client(settings.jwks_uri)

        # Get signing key from JWT (PyJWKClient extracts kid automatically)
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        # Verify and decode token with all security checks
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],  # Only allow RS256
            audience=settings.client_id,  # Validate audience claim
            issuer=settings.issuer,  # Validate issuer claim
            leeway=10,  # Allow 10 seconds clock skew tolerance
            options={
                "verify_signature": True,
                "verify_exp": True,  # Check expiration
                "verify_aud": True,  # Check audience
                "verify_iss": True,  # Check issuer
                "require": ["exp", "iat", "sub"]  # Require these claims
            }
        )

        return TokenData(**payload)

    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except InvalidAudienceError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token audience",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except InvalidTokenError as e:
        print(f"DEBUG: Invalid token error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except Exception as e:
        # Catch-all for unexpected errors (JWKS fetch failures, etc.)
        print(f"DEBUG: Token validation exception: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"}
        )

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> TokenData:
    """
    Dependency to get current authenticated user from Bearer token

    Usage:
        @app.get("/protected")
        async def protected_route(user: TokenData = Depends(get_current_user)):
            return {"user_id": user.sub, "email": user.email}

    Args:
        credentials: HTTP Bearer token from request header

    Returns:
        TokenData with user information

    Raises:
        HTTPException: If authentication fails
    """
    token = credentials.credentials
    return await verify_token(token)

async def get_current_user_from_cookie(
    access_token: Optional[str] = Cookie(None)
) -> TokenData:
    """
    Dependency to get current authenticated user from cookie

    Usage:
        @app.get("/protected")
        async def protected_route(user: TokenData = Depends(get_current_user_from_cookie)):
            return {"user_id": user.sub, "email": user.email}

    Args:
        access_token: JWT token from cookie

    Returns:
        TokenData with user information

    Raises:
        HTTPException: If authentication fails or no token provided
    """
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"}
        )
    return await verify_token(access_token)

def require_group(required_groups: List[str]):
    """
    Dependency factory for role-based access control

    Usage:
        @app.get("/admin")
        async def admin_route(user: TokenData = Depends(require_group(["admin"]))):
            return {"message": "Admin access granted"}

    Args:
        required_groups: List of allowed group names

    Returns:
        Dependency function that checks user groups

    Raises:
        HTTPException: If user is not in any of the required groups
    """
    async def check_groups(user: TokenData = Depends(get_current_user)) -> TokenData:
        if not any(group in user.groups for group in required_groups):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"User must be in one of these groups: {required_groups}"
            )
        return user
    return check_groups
