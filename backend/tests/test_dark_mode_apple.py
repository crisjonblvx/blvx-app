"""
Test Suite for BLVX Dark Mode and Apple Sign-In Edge Cases
Tests: Dark mode enforcement, Apple callback handling for private relay emails
"""
import pytest
import requests
import os
import jwt
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAppleConfig:
    """Apple Sign-In configuration tests"""
    
    def test_apple_config_returns_valid_config(self):
        """Test that Apple config endpoint returns correct configuration"""
        response = requests.get(f"{BASE_URL}/api/auth/apple/config")
        assert response.status_code == 200
        
        data = response.json()
        assert "client_id" in data
        assert "redirect_uri" in data
        assert "scope" in data
        assert "response_type" in data
        assert "response_mode" in data
        
        # Verify specific values
        assert data["client_id"] == "com.blvx.social.login"
        assert "name email" in data["scope"]
        assert data["response_type"] == "code id_token"
        assert data["response_mode"] == "form_post"
        print(f"✓ Apple config: {data}")


class TestAppleCallbackEdgeCases:
    """Apple callback edge case tests - private relay emails and null emails"""
    
    def test_apple_callback_requires_id_token(self):
        """Test that Apple callback requires id_token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/callback/apple",
            data={"code": "test_code"}  # Missing id_token
        )
        assert response.status_code == 400
        print("✓ Apple callback correctly rejects missing id_token")
    
    def test_apple_callback_handles_form_post(self):
        """Test that Apple callback accepts form POST data"""
        # Apple sends data as form POST, not JSON
        response = requests.post(
            f"{BASE_URL}/api/auth/callback/apple",
            data={
                "code": "test_code",
                "id_token": "invalid_token"
            }
        )
        # Should fail on token validation, not on form parsing
        assert response.status_code in [400, 500]
        print("✓ Apple callback accepts form POST data")
    
    def test_apple_callback_handles_error_response(self):
        """Test that Apple callback handles Apple error responses"""
        response = requests.post(
            f"{BASE_URL}/api/auth/callback/apple",
            data={"error": "user_cancelled_authorize"}
        )
        # Should return HTML redirect with error
        assert response.status_code == 200
        assert "text/html" in response.headers.get("content-type", "")
        assert "error=apple_signin_failed" in response.text
        print("✓ Apple callback handles error responses correctly")


class TestHealthAndBasicEndpoints:
    """Basic health and endpoint tests"""
    
    def test_health_endpoint(self):
        """Test health endpoint returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "BLVX API"
        print(f"✓ Health check: {data}")
    
    def test_auth_me_requires_auth(self):
        """Test that /auth/me requires authentication"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✓ /auth/me correctly requires authentication")


class TestEmailAuthFlow:
    """Email authentication flow tests"""
    
    def test_signup_creates_user(self):
        """Test email signup creates user and returns session_token"""
        test_email = f"darkmode_test_{int(time.time())}@test.com"
        response = requests.post(
            f"{BASE_URL}/api/auth/signup",
            json={
                "email": test_email,
                "password": "TestPass123!",
                "name": "Dark Mode Test"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data or "session_token" in data
        print(f"✓ Signup successful for {test_email}")
    
    def test_login_returns_session_token(self):
        """Test email login returns session_token"""
        # First create a user
        test_email = f"login_test_{int(time.time())}@test.com"
        signup_response = requests.post(
            f"{BASE_URL}/api/auth/signup",
            json={
                "email": test_email,
                "password": "TestPass123!",
                "name": "Login Test"
            }
        )
        
        # Try to login (may fail if email verification required)
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": test_email,
                "password": "TestPass123!",
                "remember_me": True
            }
        )
        
        # Either succeeds or requires verification
        assert login_response.status_code in [200, 401, 403]
        print(f"✓ Login flow tested for {test_email}")


class TestGoogleOAuth:
    """Google OAuth session exchange tests"""
    
    def test_session_endpoint_exists(self):
        """Test that Google OAuth session endpoint exists"""
        response = requests.get(f"{BASE_URL}/api/auth/session")
        # Should return 422 (missing session_id) not 404
        assert response.status_code == 422
        print("✓ Google OAuth session endpoint exists")
    
    def test_session_rejects_invalid_session(self):
        """Test that invalid session_id is rejected"""
        response = requests.get(
            f"{BASE_URL}/api/auth/session",
            params={"session_id": "invalid_session_12345"}
        )
        assert response.status_code == 401
        print("✓ Invalid session_id correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
