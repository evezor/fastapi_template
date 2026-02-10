
from fastapi import Depends, FastAPI, Request, Form, status, Header, Response, Cookie, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from starlette.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional
import os
import secrets

# Import authentication modules
from auth import AuthentikSettings, AuthentikOAuth, get_current_user, TokenData, verify_token

app = FastAPI()
templates = Jinja2Templates(directory='htmldirectory')
app.mount("/static", StaticFiles(directory="static", html=True), name="static")

# Initialize authentication
auth_settings = AuthentikSettings()
oauth_client = AuthentikOAuth(auth_settings)

# In-memory state storage (use Redis in production)
oauth_states = {}


@app.get('/', response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse('index.html', {'request': request})


# ===== Authentication Routes =====

@app.get("/auth/login")
async def login():
    """Redirect user to Authentik for authentication"""
    state = secrets.token_urlsafe(32)
    oauth_states[state] = True  # Store state to verify later

    auth_url = oauth_client.get_authorization_url(state)
    return RedirectResponse(url=auth_url)


@app.get("/auth/callback")
async def auth_callback(
    code: str,
    state: str,
    response: Response
):
    """Handle OAuth callback from Authentik"""
    # Verify state to prevent CSRF
    if state not in oauth_states:
        raise HTTPException(status_code=400, detail="Invalid state parameter")

    oauth_states.pop(state)  # Remove used state

    # Exchange code for tokens
    token_response = await oauth_client.exchange_code_for_token(code)

    # Get user info
    user_info = await oauth_client.get_userinfo(token_response.access_token)

    # Set tokens in httponly cookies (secure in production)
    response.set_cookie(
        key="access_token",
        value=token_response.access_token,
        httponly=True,
        secure=True,  # HTTPS only
        samesite="lax",
        max_age=600  # 10 minutes
    )

    if token_response.refresh_token:
        response.set_cookie(
            key="refresh_token",
            value=token_response.refresh_token,
            httponly=True,
            secure=True,
            samesite="lax",
            max_age=86400  # 24 hours
        )

    # Redirect to home page
    return RedirectResponse(url="/", status_code=303)


@app.post("/auth/refresh")
async def refresh_token(
    refresh_token: Optional[str] = Cookie(None),
    response: Response = None
):
    """Refresh access token using refresh token"""
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token provided")

    token_response = await oauth_client.refresh_access_token(refresh_token)

    response.set_cookie(
        key="access_token",
        value=token_response.access_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=600
    )

    return {"message": "Token refreshed successfully"}


@app.post("/auth/logout")
async def logout(response: Response):
    """Logout user by clearing cookies"""
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")

    return {"message": "Logged out successfully"}


# ===== API Routes =====

@app.get("/api/auth/status")
async def auth_status(access_token: Optional[str] = Cookie(None)):
    """
    Check authentication status from cookie
    This endpoint is public and returns whether user is authenticated
    """
    if not access_token:
        return {
            "authenticated": False,
            "user": None
        }

    try:
        # Verify token from cookie
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
        # Token invalid or expired
        return {
            "authenticated": False,
            "user": None
        }


@app.get("/api/me")
async def get_me(user: TokenData = Depends(get_current_user)):
    """
    Example protected endpoint - requires authentication
    Returns current user information
    """
    return {
        "user_id": user.sub,
        "email": user.email,
        "name": user.name,
        "username": user.preferred_username,
        "groups": user.groups
    }


# ===== Protected Pages =====

@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard(request: Request, access_token: Optional[str] = Cookie(None)):
    """Protected dashboard page - requires authentication"""
    if not access_token:
        return RedirectResponse(url="/auth/login")

    try:
        # Verify token
        user_data = await verify_token(access_token)
        return templates.TemplateResponse('dashboard.html', {
            'request': request,
            'user': user_data
        })
    except Exception:
        # Token invalid, redirect to login
        return RedirectResponse(url="/auth/login")


