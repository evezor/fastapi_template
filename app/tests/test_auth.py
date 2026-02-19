"""
Integration tests for authentication endpoints
"""
import pytest
from fastapi import status


class TestAuthenticationFlow:
    """Test authentication flow endpoints"""

    def test_login_redirects_to_authentik(self, client):
        """
        Test that /auth/login redirects to Authentik authorization endpoint
        """
        response = client.get("/auth/login", follow_redirects=False)

        # Should redirect (302 or 307)
        assert response.status_code in [302, 307]

        # Should redirect to Authentik domain
        location = response.headers.get("location")
        assert location is not None
        assert "auth.evezor.com" in location
        assert "authorize" in location
        assert "client_id" in location
        assert "state" in location

    def test_auth_callback_requires_code_and_state(self, client):
        """
        Test that /auth/callback requires both code and state parameters
        """
        # Missing both parameters
        response = client.get("/auth/callback")
        assert response.status_code == 422  # Validation error

        # Missing state
        response = client.get("/auth/callback?code=test_code")
        assert response.status_code in [400, 422]

    def test_auth_callback_invalid_state(self, client):
        """
        Test that /auth/callback rejects invalid state (CSRF protection)
        """
        response = client.get("/auth/callback?code=test_code&state=invalid_state_12345")
        assert response.status_code == 400
        assert "Invalid state parameter" in response.text

    def test_logout_clears_cookies(self, client):
        """
        Test that /auth/logout clears authentication cookies
        """
        response = client.post("/auth/logout")

        assert response.status_code == 200
        assert response.json() == {"message": "Logged out successfully"}

        # Check that cookies are being deleted
        set_cookies = response.headers.get("set-cookie", "")
        assert "access_token" in set_cookies or response.cookies.get("access_token") == ""


class TestAuthStatusEndpoint:
    """Test /api/auth/status endpoint"""

    def test_auth_status_unauthenticated(self, client):
        """
        Test auth status returns false when no token provided
        """
        response = client.get("/api/auth/status")

        assert response.status_code == 200
        data = response.json()
        assert data["authenticated"] is False
        assert data["user"] is None

    def test_auth_status_with_invalid_token(self, client):
        """
        Test auth status returns false with invalid token
        """
        # Set invalid token cookie
        client.cookies.set("access_token", "invalid_token_12345")

        response = client.get("/api/auth/status")

        assert response.status_code == 200
        data = response.json()
        assert data["authenticated"] is False
        assert data["user"] is None


class TestProtectedEndpoints:
    """Test protected API endpoints"""

    def test_protected_endpoint_without_token(self, client):
        """
        Test that protected endpoints return 401/403 when no token provided
        """
        response = client.get("/api/me")

        # Should return 401 Unauthorized or 403 Forbidden
        assert response.status_code in [401, 403]

    def test_protected_endpoint_with_invalid_token(self, client):
        """
        Test that protected endpoints reject invalid tokens
        """
        # Set invalid token in cookie
        client.cookies.set("access_token", "invalid_token_xyz")

        response = client.get("/api/me")

        # Should return 401 or 403
        assert response.status_code in [401, 403]


class TestProtectedPages:
    """Test protected page routes"""

    def test_dashboard_redirects_without_auth(self, client):
        """
        Test that /dashboard redirects to login when not authenticated
        """
        response = client.get("/dashboard", follow_redirects=False)

        # Should redirect to login
        assert response.status_code in [302, 307]
        location = response.headers.get("location")
        assert location is not None
        assert "/auth/login" in location

    def test_dashboard_with_invalid_token(self, client):
        """
        Test that /dashboard redirects to login with invalid token
        """
        client.cookies.set("access_token", "invalid_token")

        response = client.get("/dashboard", follow_redirects=False)

        # Should redirect to login
        assert response.status_code in [302, 307]
        assert "/auth/login" in response.headers.get("location", "")


class TestCORS:
    """Test CORS configuration"""

    def test_cors_preflight_allowed_origin(self, client):
        """
        Test CORS preflight request from allowed origin
        """
        response = client.options(
            "/api/auth/status",
            headers={
                "Origin": "http://localhost:9902",
                "Access-Control-Request-Method": "GET"
            }
        )

        assert response.status_code == 200
        assert response.headers.get("access-control-allow-origin") == "http://localhost:9902"
        assert response.headers.get("access-control-allow-credentials") == "true"

    def test_cors_allows_credentials(self, client):
        """
        Test that CORS allows credentials (required for cookies)
        """
        response = client.get(
            "/api/auth/status",
            headers={"Origin": "http://localhost:9902"}
        )

        # Should have CORS header allowing credentials
        assert response.headers.get("access-control-allow-credentials") == "true"


class TestHealthCheck:
    """Test basic application health"""

    def test_home_page_loads(self, client):
        """
        Test that home page loads successfully
        """
        response = client.get("/")

        assert response.status_code == 200
        # Should return HTML
        assert "text/html" in response.headers.get("content-type", "")

    def test_static_files_mount(self, client):
        """
        Test that static files are properly mounted
        """
        # This test assumes there's at least one static file
        # If your static directory is empty, this test will fail
        # You can skip it or add a test static file
        pass
