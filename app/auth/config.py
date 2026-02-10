from pydantic_settings import BaseSettings

class AuthentikSettings(BaseSettings):
    """Authentik OAuth2/OIDC configuration settings"""

    domain: str
    client_id: str
    client_secret: str
    redirect_uri: str

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
        return f"{self.domain}/application/o/{self.client_id}/jwks/"

    class Config:
        env_prefix = "AUTHENTIK_"
        env_file = ".env"
