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
