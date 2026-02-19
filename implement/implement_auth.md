# Authentik Authentication Implementation Guide

## Overview

This guide provides everything you need to implement the Authentik OAuth2/OIDC authentication scheme on any FastAPI container. This implementation has been tested and deployed on `home.evezor.com` and can be replicated on `evezor.com`, `floe.evezor.com`, or any other FastAPI application.

**What This Provides:**
- 🔐 OAuth2 Authorization Code Flow with Authentik
- 🎫 JWT token validation using JWKS (stateless, scalable)
- 🍪 Cookie-based authentication with httponly security
- 🔄 Automatic token refresh
- 👥 Role-based access control (RBAC) with groups
- 🖼️ Ready-to-use frontend templates
- 🔒 Protected routes and API endpoints
- ✅ Full Single Sign-On (SSO) support across multiple apps

**Architecture:**
- **Backend**: FastAPI with JWT validation
- **Auth Provider**: Authentik (OAuth2/OIDC)
- **Token Storage**: Secure httponly cookies
- **Token Validation**: Local validation using Authentik's JWKS public keys
- **SSO**: Shared authentication across multiple domains

---

## Prerequisites

### Required Software
- Docker & Docker Compose
- Python 3.12+ (in container)
- Authentik server (e.g., `auth.evezor.com`)

### Required Knowledge
- Basic FastAPI understanding
- Docker/Docker Compose basics
- OAuth2/OIDC concepts (optional but helpful)

### Authentik Configuration
Before implementing, you must have:
1. ✅ Authentik OAuth2 provider created
2. ✅ Client ID and Client Secret
3. ✅ Redirect URIs configured
4. ✅ Scopes enabled: `openid`, `profile`, `email`, `groups`, `offline_access`
5. ✅ Application created in Authentik

**Reference**: See `authentik.md` Phase 1 for complete Authentik setup instructions.

---

## Implementation Steps

### Step 1: Copy the Authentication Module

The authentication logic is contained in the `app/auth/` directory. Copy this entire directory to your FastAPI application.

**Directory Structure:**
```
your-app/
├── app/
│   ├── auth/                    # ← Copy this entire directory
│   │   ├── __init__.py
│   │   ├── config.py            # Authentik configuration
│   │   ├── models.py            # Pydantic models
│   │   ├── oauth.py             # OAuth flow handlers
│   │   ├── jwks.py              # JWKS key fetching
│   │   └── dependencies.py      # FastAPI dependencies
│   ├── main.py                  # Your FastAPI app
│   ├── requirements.txt
│   └── ...
```

**Files to Copy:**

#### `app/auth/__init__.py`
```python
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
```

#### `app/auth/config.py`
```python
from pydantic_settings import BaseSettings

class AuthentikSettings(BaseSettings):
    """Authentik OAuth2/OIDC configuration settings"""

    domain: str
    client_id: str
    client_secret: str
    redirect_uri: str
    app_slug: str = "evezor"  # Application/Provider slug in Authentik

    @property
    def authorization_endpoint(self) -> str:
        """OAuth2 authorization endpoint"""
        return f"{self.domain}/application/o/authorize/"

    @property
    def token_endpoint(self) -> str:
        """OAuth2 token endpoint"""
        return f"{self.domain}/application/o/token/"

    @property
    def userinfo_endpoint(self) -> str:
        """OIDC userinfo endpoint"""
        return f"{self.domain}/application/o/userinfo/"

    @property
    def jwks_uri(self) -> str:
        """JWKS endpoint for public key verification"""
        return f"{self.domain}/application/o/{self.app_slug}/jwks/"

    @property
    def issuer(self) -> str:
        """OAuth2 issuer claim (for JWT validation)"""
        return f"{self.domain}/application/o/{self.app_slug}/"

    class Config:
        env_prefix = "AUTHENTIK_"
        env_file = ".env"
```

#### `app/auth/models.py`
```python
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
```

#### `app/auth/oauth.py`
```python
from fastapi import HTTPException, status
import httpx
from .config import AuthentikSettings
from .models import TokenResponse, UserInfo

class AuthentikOAuth:
    """OAuth2/OIDC client for Authentik integration"""

    def __init__(self, settings: AuthentikSettings):
        """
        Initialize OAuth client

        Args:
            settings: Authentik configuration settings
        """
        self.settings = settings

    def get_authorization_url(self, state: str) -> str:
        """
        Generate authorization URL for OAuth flow

        Args:
            state: Random state parameter for CSRF protection

        Returns:
            Full authorization URL to redirect user to
        """
        params = {
            "client_id": self.settings.client_id,
            "response_type": "code",
            "redirect_uri": self.settings.redirect_uri,
            "scope": "openid profile email groups offline_access",
            "state": state,
        }
        query = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"{self.settings.authorization_endpoint}?{query}"

    async def exchange_code_for_token(self, code: str) -> TokenResponse:
        """
        Exchange authorization code for access and refresh tokens

        Args:
            code: Authorization code from OAuth callback

        Returns:
            TokenResponse with access_token and refresh_token

        Raises:
            HTTPException: If token exchange fails
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.settings.token_endpoint,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": self.settings.redirect_uri,
                    "client_id": self.settings.client_id,
                    "client_secret": self.settings.client_secret,
                }
            )
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Failed to exchange authorization code"
                )
            return TokenResponse(**response.json())

    async def refresh_access_token(self, refresh_token: str) -> TokenResponse:
        """
        Use refresh token to get new access token

        Args:
            refresh_token: Refresh token from previous login

        Returns:
            TokenResponse with new access_token

        Raises:
            HTTPException: If token refresh fails
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.settings.token_endpoint,
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                    "client_id": self.settings.client_id,
                    "client_secret": self.settings.client_secret,
                }
            )
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Failed to refresh token"
                )
            return TokenResponse(**response.json())

    async def get_userinfo(self, access_token: str) -> UserInfo:
        """
        Fetch user information from Authentik userinfo endpoint

        Args:
            access_token: Valid access token

        Returns:
            UserInfo with user profile data

        Raises:
            HTTPException: If userinfo request fails
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.settings.userinfo_endpoint,
                headers={"Authorization": f"Bearer {access_token}"}
            )
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Failed to get user info"
                )
            return UserInfo(**response.json())
```

#### `app/auth/jwks.py`
```python
import jwt
from jwt import PyJWKClient
from typing import Optional

class AuthentikJWKSClient:
    """Wrapper around PyJWT's PyJWKClient for JWKS-based token verification"""

    def __init__(self, jwks_uri: str, cache_ttl: int = 300):
        """
        Initialize JWKS client

        Args:
            jwks_uri: Authentik JWKS endpoint URL
            cache_ttl: Cache time-to-live in seconds (default 5 minutes)
        """
        self.jwks_uri = jwks_uri
        # PyJWKClient handles caching and key rotation automatically
        self._client = PyJWKClient(
            uri=jwks_uri,
            cache_keys=True,
            max_cached_keys=16,
            lifespan=cache_ttl  # TTL for cached JWKS in seconds
        )

    def get_signing_key_from_jwt(self, token: str):
        """
        Get signing key for a JWT token

        PyJWKClient automatically:
        - Extracts kid from token header
        - Fetches from JWKS endpoint (with caching)
        - Handles key rotation
        - Retries if kid not found after cache refresh

        Args:
            token: JWT token string

        Returns:
            Signing key object for verification
        """
        return self._client.get_signing_key_from_jwt(token)

# Global singleton instance (initialized in dependencies.py)
_jwks_client: Optional[AuthentikJWKSClient] = None

def get_jwks_client(jwks_uri: str) -> AuthentikJWKSClient:
    """
    Get or create JWKS client singleton

    Args:
        jwks_uri: Authentik JWKS endpoint URL

    Returns:
        AuthentikJWKSClient instance
    """
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = AuthentikJWKSClient(jwks_uri)
    return _jwks_client
```

#### `app/auth/dependencies.py`
```python
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
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except Exception as e:
        # Catch-all for unexpected errors (JWKS fetch failures, etc.)
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
```

---

### Step 2: Install Required Dependencies

Add these packages to your `app/requirements.txt`:

```txt
fastapi
python-multipart>=0.0.9
jinja2
uvicorn
PyJWT[crypto]>=2.8.0
httpx>=0.27.0
cryptography>=41.0.0
pydantic-settings>=2.0.0

# Testing dependencies (optional)
pytest>=7.4.0
pytest-asyncio>=0.21.0
```

**After updating requirements.txt**, rebuild your container:
```bash
docker-compose build <your-service-name>
docker-compose up -d <your-service-name>
```

---

### Step 3: Configure Environment Variables

Create or update your `.env` file in the project root:

```env
# ===== Authentik OAuth2/OIDC Configuration =====

# Cookie Security (False for HTTP development, True for HTTPS production)
SECURE_COOKIES=false

# Authentik server domain
AUTHENTIK_DOMAIN=https://auth.evezor.com

# OAuth2 Client credentials (from Authentik admin panel)
AUTHENTIK_CLIENT_ID=<your-client-id>
AUTHENTIK_CLIENT_SECRET=<your-client-secret>

# Application slug in Authentik (check your provider/application slug)
AUTHENTIK_APP_SLUG=evezor

# Redirect URI for OAuth callback
# IMPORTANT: Must match what's configured in Authentik
# Development: http://localhost:8000/auth/callback
# Production: https://yourdomain.com/auth/callback
AUTHENTIK_REDIRECT_URI=http://localhost:8000/auth/callback

# ===== Token Configuration =====
JWT_ALGORITHM=RS256
ACCESS_TOKEN_EXPIRE_MINUTES=10
REFRESH_TOKEN_EXPIRE_DAYS=1

# ===== Application Settings =====
# Environment: "development" or "production"
ENVIRONMENT=development

# Application domain
# Development: http://localhost:8000
# Production: https://yourdomain.com
APP_DOMAIN=http://localhost:8000

# Session secret key (generate with: python -c "import secrets; print(secrets.token_urlsafe(32))")
SESSION_SECRET_KEY=<generate-random-key>
```

**Important Configuration Notes:**

1. **`AUTHENTIK_APP_SLUG`**: This is the slug of your Authentik provider/application. Find it in:
   - Authentik Admin → Applications → Your App → Check the URL or slug field
   - It's used to construct the JWKS and issuer URLs

2. **`AUTHENTIK_REDIRECT_URI`**: Must exactly match what you configured in Authentik's redirect URIs

3. **`SECURE_COOKIES`**:
   - Set to `false` for local HTTP development
   - Set to `true` for production HTTPS deployment

4. **Different Apps Need Different Config**:
   - `evezor.com`: `AUTHENTIK_REDIRECT_URI=https://evezor.com/auth/callback`
   - `floe.evezor.com`: `AUTHENTIK_REDIRECT_URI=https://floe.evezor.com/auth/callback`

---

### Step 4: Update docker-compose.yml

Ensure your `docker-compose.yml` loads the `.env` file:

```yaml
services:
  your-service:
    build:
      context: ./app
      dockerfile: Dockerfile
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
    environment:
      PYTHONUNBUFFERED: 1
      PYTHONDONTWRITEBYTECODE: 1
    env_file:
      - .env  # ← Load environment variables
    ports:
      - 8000:8000
    volumes:
      - ./app:/app
```

---

### Step 5: Integrate Authentication Routes in main.py

Update your `app/main.py` to include authentication routes:

```python
from fastapi import Depends, FastAPI, Request, Cookie, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from typing import Optional
import os
import secrets

# Secure cookie configuration
SECURE_COOKIES = os.getenv("SECURE_COOKIES", "false").lower() == "true"

# Import authentication modules
from auth import (
    AuthentikSettings,
    AuthentikOAuth,
    get_current_user_from_cookie,
    TokenData,
    verify_token
)

app = FastAPI()

# ===== CORS Configuration =====
dev_origins = [
    "http://localhost:9902",  # Your frontend dev server
]

prod_origins = [
    "https://yourdomain.com",  # Your production domain
]

ENV = os.getenv("ENVIRONMENT", "development")
allowed_origins = prod_origins if ENV == "production" else dev_origins + prod_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,  # Required for cookies
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# Templates and static files
templates = Jinja2Templates(directory='htmldirectory')
app.mount("/static", StaticFiles(directory="static", html=True), name="static")

# Initialize authentication
auth_settings = AuthentikSettings()
oauth_client = AuthentikOAuth(auth_settings)

# In-memory state storage (use Redis in production)
oauth_states = {}


# ===== Authentication Routes =====

@app.get("/auth/login")
async def login():
    """Redirect user to Authentik for authentication"""
    state = secrets.token_urlsafe(32)
    oauth_states[state] = True  # Store state to verify later

    auth_url = oauth_client.get_authorization_url(state)
    return RedirectResponse(url=auth_url)


@app.get("/auth/callback")
async def auth_callback(code: str, state: str):
    """Handle OAuth callback from Authentik"""
    # Verify state to prevent CSRF
    if state not in oauth_states:
        raise HTTPException(status_code=400, detail="Invalid state parameter")

    oauth_states.pop(state)  # Remove used state

    # Exchange code for tokens
    token_response = await oauth_client.exchange_code_for_token(code)

    # Get user info
    user_info = await oauth_client.get_userinfo(token_response.access_token)

    # Create redirect response
    response = RedirectResponse(url="/", status_code=303)

    # Set tokens in httponly cookies
    response.set_cookie(
        key="access_token",
        value=token_response.access_token,
        httponly=True,
        secure=SECURE_COOKIES,
        samesite="lax",
        max_age=600  # 10 minutes
    )

    if token_response.refresh_token:
        response.set_cookie(
            key="refresh_token",
            value=token_response.refresh_token,
            httponly=True,
            secure=SECURE_COOKIES,
            samesite="lax",
            max_age=86400  # 24 hours
        )

    return response


@app.post("/auth/refresh")
async def refresh_token(refresh_token: Optional[str] = Cookie(None)):
    """Refresh access token using refresh token"""
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token provided")

    token_response = await oauth_client.refresh_access_token(refresh_token)

    response = JSONResponse(content={"message": "Token refreshed successfully"})

    response.set_cookie(
        key="access_token",
        value=token_response.access_token,
        httponly=True,
        secure=SECURE_COOKIES,
        samesite="lax",
        max_age=600
    )

    return response


@app.post("/auth/logout")
async def logout():
    """Logout user by clearing cookies"""
    response = JSONResponse(content={"message": "Logged out successfully"})
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return response


# ===== API Routes =====

@app.get("/api/auth/status")
async def auth_status(access_token: Optional[str] = Cookie(None)):
    """
    Check authentication status from cookie (public endpoint)
    """
    if not access_token:
        return {"authenticated": False, "user": None}

    try:
        user_data = await verify_token(access_token)
        return {
            "authenticated": True,
            "user": {
                "email": user_data.email,
                "name": user_data.name,
                "username": user_data.preferred_username,
                "groups": user_data.groups
            }
        }
    except Exception:
        return {"authenticated": False, "user": None}


@app.get("/api/me")
async def get_me(user: TokenData = Depends(get_current_user_from_cookie)):
    """
    Protected endpoint - returns current user information
    """
    return {
        "user_id": user.sub,
        "email": user.email,
        "name": user.name,
        "username": user.preferred_username,
        "groups": user.groups
    }


# ===== Your existing routes =====

@app.get('/', response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse('index.html', {'request': request})
```

---

### Step 6: Add Frontend Templates (Optional)

If you want a ready-to-use authentication UI, copy these templates to your `app/htmldirectory/` directory:

#### `app/htmldirectory/base.html`
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{% block title %}Home{% endblock %} - Your App</title>
    <link rel="icon" href="/static/favicon.ico">
    <style>
        /* Authentication UI Styles */
        body {
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        }
        .auth-nav {
            background: #2c3e50;
            padding: 1rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .auth-nav .logo {
            color: white;
            font-size: 1.5rem;
            font-weight: bold;
            text-decoration: none;
        }
        .auth-status {
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        .user-info {
            color: #ecf0f1;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .user-avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: #3498db;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
        }
        .btn {
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            text-decoration: none;
            font-size: 0.9rem;
            transition: all 0.3s ease;
            display: inline-block;
        }
        .btn-primary {
            background: #3498db;
            color: white;
        }
        .btn-primary:hover {
            background: #2980b9;
        }
        .btn-danger {
            background: #e74c3c;
            color: white;
        }
        .btn-danger:hover {
            background: #c0392b;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }
        .alert {
            padding: 1rem;
            border-radius: 4px;
            margin-bottom: 1rem;
        }
        .alert-info {
            background: #d1ecf1;
            color: #0c5460;
            border: 1px solid #bee5eb;
        }
        .alert-success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
    </style>
</head>
<body>
    <!-- Navigation Bar with Authentication -->
    <nav class="auth-nav">
        <a href="/" class="logo">Your App Name</a>
        <div class="auth-status" id="authStatus">
            <div class="loading">Loading...</div>
        </div>
    </nav>

    <!-- Main Content -->
    <main class="container">
        {% block content %}{% endblock %}
    </main>

    <!-- Authentication JavaScript -->
    <script>
        // Check authentication status on page load
        async function checkAuthStatus() {
            try {
                const response = await fetch('/api/auth/status', {
                    credentials: 'include'
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.authenticated) {
                        showAuthenticatedUI(data.user);
                    } else {
                        showUnauthenticatedUI();
                    }
                } else {
                    showUnauthenticatedUI();
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                showUnauthenticatedUI();
            }
        }

        function showAuthenticatedUI(user) {
            const authStatus = document.getElementById('authStatus');
            const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : '?';

            authStatus.innerHTML = `
                <div class="user-info">
                    <div class="user-avatar">${initials}</div>
                    <span>Welcome, ${user.name || user.email}</span>
                </div>
                <button class="btn btn-danger" onclick="logout()">Logout</button>
            `;
        }

        function showUnauthenticatedUI() {
            const authStatus = document.getElementById('authStatus');
            authStatus.innerHTML = `
                <a href="/auth/login" class="btn btn-primary">Login</a>
            `;
        }

        async function logout() {
            try {
                const response = await fetch('/auth/logout', {
                    method: 'POST',
                    credentials: 'include'
                });

                if (response.ok) {
                    window.location.href = '/';
                }
            } catch (error) {
                console.error('Logout failed:', error);
                alert('Logout failed. Please try again.');
            }
        }

        // Auto-refresh token before expiration (every 8 minutes)
        setInterval(async () => {
            try {
                await fetch('/auth/refresh', {
                    method: 'POST',
                    credentials: 'include'
                });
            } catch (error) {
                console.error('Token refresh failed:', error);
            }
        }, 8 * 60 * 1000);

        // Check auth status on page load
        document.addEventListener('DOMContentLoaded', checkAuthStatus);
    </script>

    {% block extra_scripts %}{% endblock %}
</body>
</html>
```

#### `app/htmldirectory/dashboard.html` (Example Protected Page)
```html
{% extends "base.html" %}

{% block title %}Dashboard{% endblock %}

{% block content %}
<div style="max-width: 900px; margin: 0 auto;">
    <h1>🔒 Protected Dashboard</h1>
    <p style="color: #7f8c8d; margin-bottom: 2rem;">This page is only accessible to authenticated users.</p>

    <div class="alert alert-success">
        <h3>✓ Authentication Successful</h3>
        <p>You have successfully authenticated with Authentik.</p>
    </div>

    <div style="background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h2>Your Profile</h2>
        <table style="width: 100%; margin-top: 1rem;">
            <tr style="border-bottom: 1px solid #ecf0f1;">
                <td style="padding: 0.75rem; font-weight: bold;">User ID:</td>
                <td style="padding: 0.75rem;"><code>{{ user.sub }}</code></td>
            </tr>
            <tr style="border-bottom: 1px solid #ecf0f1;">
                <td style="padding: 0.75rem; font-weight: bold;">Email:</td>
                <td style="padding: 0.75rem;">{{ user.email or 'N/A' }}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ecf0f1;">
                <td style="padding: 0.75rem; font-weight: bold;">Name:</td>
                <td style="padding: 0.75rem;">{{ user.name or 'N/A' }}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ecf0f1;">
                <td style="padding: 0.75rem; font-weight: bold;">Username:</td>
                <td style="padding: 0.75rem;">{{ user.preferred_username or 'N/A' }}</td>
            </tr>
            <tr>
                <td style="padding: 0.75rem; font-weight: bold;">Groups:</td>
                <td style="padding: 0.75rem;">
                    {% if user.groups %}
                        {% for group in user.groups %}
                            <span style="background: #3498db; color: white; padding: 0.25rem 0.75rem; border-radius: 12px; margin-right: 0.5rem;">{{ group }}</span>
                        {% endfor %}
                    {% else %}
                        <span style="color: #7f8c8d;">No groups assigned</span>
                    {% endif %}
                </td>
            </tr>
        </table>
    </div>
</div>
{% endblock %}
```

**Add the protected dashboard route to `main.py`:**
```python
@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard(request: Request, access_token: Optional[str] = Cookie(None)):
    """Protected dashboard page"""
    if not access_token:
        return RedirectResponse(url="/auth/login")

    try:
        user_data = await verify_token(access_token)
        return templates.TemplateResponse('dashboard.html', {
            'request': request,
            'user': user_data
        })
    except Exception:
        return RedirectResponse(url="/auth/login")
```

---

## Customizing for Different Apps

### For evezor.com

1. **Update `.env`:**
   ```env
   AUTHENTIK_REDIRECT_URI=https://evezor.com/auth/callback
   APP_DOMAIN=https://evezor.com
   ENVIRONMENT=production
   SECURE_COOKIES=true
   ```

2. **Update Authentik**: Add `https://evezor.com/auth/callback` to redirect URIs

3. **Update `base.html`**: Change logo text to "Evezor"

### For floe.evezor.com

1. **Update `.env`:**
   ```env
   AUTHENTIK_REDIRECT_URI=https://floe.evezor.com/auth/callback
   APP_DOMAIN=https://floe.evezor.com
   ENVIRONMENT=production
   SECURE_COOKIES=true
   ```

2. **Update Authentik**: Add `https://floe.evezor.com/auth/callback` to redirect URIs

3. **Update `base.html`**: Change logo text to "Floe"

### SSO Between Apps

Both apps can share the same OAuth provider in Authentik by using the **same client ID and secret**. When a user logs into one app, they'll automatically be logged into the other app (same-domain SSO).

**Option 1: Shared Provider** (Recommended)
- Use the same `AUTHENTIK_CLIENT_ID` and `AUTHENTIK_CLIENT_SECRET` in both apps
- Add all redirect URIs to the same provider

**Option 2: Separate Providers with Same Audience**
- Create separate providers for each app
- Ensure both issue tokens with compatible audience claims

---

## Usage Examples

### Protect an API Endpoint

```python
from fastapi import Depends
from auth import get_current_user_from_cookie, TokenData

@app.get("/api/protected")
async def protected_endpoint(user: TokenData = Depends(get_current_user_from_cookie)):
    """Only authenticated users can access this"""
    return {
        "message": "You are authenticated!",
        "user_id": user.sub,
        "email": user.email
    }
```

### Protect with Role-Based Access Control

```python
from auth import require_group

@app.get("/api/admin")
async def admin_only(user: TokenData = Depends(require_group(["admin"]))):
    """Only users in 'admin' group can access"""
    return {"message": "Admin access granted"}
```

### Protect an HTML Page

```python
from fastapi import Request, Cookie
from fastapi.responses import HTMLResponse, RedirectResponse
from typing import Optional

@app.get("/admin-panel", response_class=HTMLResponse)
async def admin_panel(request: Request, access_token: Optional[str] = Cookie(None)):
    """Protected HTML page"""
    if not access_token:
        return RedirectResponse(url="/auth/login")

    try:
        user_data = await verify_token(access_token)

        # Optional: Check if user is admin
        if "admin" not in user_data.groups:
            return HTMLResponse(content="<h1>403 Forbidden</h1>", status_code=403)

        return templates.TemplateResponse('admin.html', {
            'request': request,
            'user': user_data
        })
    except Exception:
        return RedirectResponse(url="/auth/login")
```

### Use in API Clients (Frontend JavaScript)

```javascript
// Fetch with credentials to include cookies
const response = await fetch('/api/me', {
    credentials: 'include'
});

if (response.ok) {
    const userData = await response.json();
    console.log('User:', userData);
} else if (response.status === 401) {
    // Not authenticated, redirect to login
    window.location.href = '/auth/login';
}
```

---

## Testing

### Test Authentication Flow

1. **Start your application:**
   ```bash
   docker-compose up -d <service-name>
   ```

2. **Open browser:** `http://localhost:8000`

3. **Click "Login"** → Should redirect to Authentik

4. **Enter credentials** → Should redirect back to your app

5. **Verify authenticated state:**
   - Navigation shows user info
   - Can access `/dashboard`
   - Can access `/api/me`

### Test Protected Endpoints

**Unauthenticated:**
```bash
curl http://localhost:8000/api/me
# Expected: {"detail":"Not authenticated"}
```

**Authenticated (after login in browser):**
```bash
# Copy access_token from browser cookies
curl http://localhost:8000/api/me \
  -H "Authorization: Bearer <your-access-token>"
# Expected: User data JSON
```

### Test Token Refresh

```bash
# Wait 8-10 minutes after login
# Check browser console - should see automatic refresh
# Or manually trigger:
curl http://localhost:8000/auth/refresh \
  -X POST \
  -b "refresh_token=<your-refresh-token>"
```

---

## Troubleshooting

### Issue: Cookies Not Set After Login

**Symptoms:** Login successful, but still shows "not logged in"

**Solutions:**
1. Check `SECURE_COOKIES` is `false` for HTTP (local dev)
2. Verify redirect URI in `.env` matches Authentik config exactly
3. Check browser console for errors
4. Ensure cookies are enabled in browser

### Issue: "Invalid state parameter"

**Symptoms:** Error after Authentik redirects back

**Solutions:**
1. Don't restart container during OAuth flow (state is in-memory)
2. Try login flow again from the start
3. For production, implement Redis-based state storage

### Issue: Token Verification Fails

**Symptoms:** 401 errors when accessing protected routes

**Solutions:**
1. Verify `AUTHENTIK_APP_SLUG` matches your Authentik provider slug
2. Check JWKS URL is accessible: `https://auth.evezor.com/application/o/<slug>/jwks/`
3. Ensure container can reach Authentik server (network connectivity)
4. Check container logs for detailed error messages

### Issue: Groups Not Included in Token

**Symptoms:** `user.groups` is empty array

**Solutions:**
1. Verify "groups" scope is enabled in Authentik provider
2. Check user is assigned to groups in Authentik
3. Ensure groups scope mapping exists (see `authentik.md` Phase 1.1 step 5)
4. Log out and log back in to get fresh token

### Issue: CORS Errors

**Symptoms:** Frontend can't make API calls from different origin

**Solutions:**
1. Add frontend origin to `allowed_origins` in CORS middleware
2. Ensure `allow_credentials=True` is set
3. Frontend must send requests with `credentials: 'include'`

---

## Production Deployment Checklist

Before deploying to production:

- [ ] Set `SECURE_COOKIES=true` in production `.env`
- [ ] Use HTTPS for all domains
- [ ] Update `AUTHENTIK_REDIRECT_URI` to production URL
- [ ] Add production redirect URI to Authentik
- [ ] Replace in-memory `oauth_states` with Redis
- [ ] Set strong `SESSION_SECRET_KEY`
- [ ] Configure proper CORS origins (no localhost)
- [ ] Set `ENVIRONMENT=production`
- [ ] Test SSO between apps
- [ ] Monitor token refresh in production
- [ ] Set up logging for authentication events
- [ ] Configure rate limiting on auth endpoints
- [ ] Review Authentik security settings (token expiry, etc.)

---

## Additional Resources

- **Original Implementation**: See `home.evezor.com` (this repository)
- **Authentik Setup Guide**: See `authentik.md` in this repo
- **Testing Guide**: See `phase3.md` in this repo
- **Authentik Docs**: https://goauthentik.io/docs/
- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **PyJWT Docs**: https://pyjwt.readthedocs.io/

---

## Summary

**What You've Implemented:**
- ✅ Full OAuth2 Authorization Code Flow with Authentik
- ✅ JWT token validation with JWKS
- ✅ Cookie-based authentication
- ✅ Automatic token refresh
- ✅ Role-based access control (RBAC)
- ✅ Protected API endpoints and HTML pages
- ✅ Ready-to-use frontend templates
- ✅ Single Sign-On (SSO) support

**Next Steps:**
1. Copy the `app/auth/` directory to your new app
2. Update `requirements.txt` and rebuild container
3. Configure `.env` with your app's details
4. Add authentication routes to `main.py`
5. Copy templates (optional)
6. Test authentication flow
7. Deploy to production

**Questions or Issues?**
- Check `authentik.md` for detailed Authentik configuration
- Check `phase3.md` for detailed testing procedures
- Review container logs: `docker-compose logs -f <service-name>`

---

**Document Version**: 1.0
**Last Updated**: 2026-02-10
**Tested On**: FastAPI with Python 3.12, Authentik 2024+
