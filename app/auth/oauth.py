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
