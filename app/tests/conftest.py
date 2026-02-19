"""
Pytest configuration and fixtures for testing
"""
import pytest
from fastapi.testclient import TestClient
from main import app


@pytest.fixture
def client():
    """
    Create a test client for making requests to the FastAPI app
    """
    return TestClient(app)


@pytest.fixture
def mock_access_token():
    """
    Mock JWT access token for testing protected endpoints
    Note: In real tests, you'd generate a valid token or mock the verification
    """
    # This is a placeholder - in production tests you'd either:
    # 1. Generate a real token using your auth system
    # 2. Mock the verify_token function to return mock user data
    return "mock_token_for_testing"


@pytest.fixture
def mock_user_data():
    """
    Mock user data returned from token verification
    """
    return {
        "sub": "test-user-uuid-12345",
        "email": "test@example.com",
        "name": "Test User",
        "preferred_username": "testuser",
        "groups": ["user"]
    }


@pytest.fixture
def mock_admin_data():
    """
    Mock admin user data
    """
    return {
        "sub": "admin-user-uuid-67890",
        "email": "admin@example.com",
        "name": "Admin User",
        "preferred_username": "adminuser",
        "groups": ["admin", "user"]
    }
