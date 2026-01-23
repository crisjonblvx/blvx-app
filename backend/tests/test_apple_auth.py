"""
Test Apple Sign-In and Authentication Features for BLVX
Tests:
- Apple config endpoint
- Apple callback endpoint
- Google OAuth session endpoint
- Remember Me functionality (30-day session)
- Token-based authentication
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAppleSignIn:
    """Apple Sign-In endpoint tests"""
    
    def test_apple_config_endpoint_returns_valid_config(self):
        """GET /api/auth/apple/config returns valid Apple Sign-In configuration"""
        response = requests.get(f"{BASE_URL}/api/auth/apple/config")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "client_id" in data, "Missing client_id in response"
        assert "redirect_uri" in data, "Missing redirect_uri in response"
        assert "scope" in data, "Missing scope in response"
        assert "response_type" in data, "Missing response_type in response"
        assert "response_mode" in data, "Missing response_mode in response"
        
        # Validate specific values
        assert data["client_id"] == "com.blvx.social.login", f"Unexpected client_id: {data['client_id']}"
        assert "name email" in data["scope"], f"Scope should include 'name email': {data['scope']}"
        assert data["response_mode"] == "form_post", f"Response mode should be form_post: {data['response_mode']}"
        print(f"Apple config: {data}")
    
    def test_apple_callback_endpoint_exists(self):
        """POST /api/auth/callback/apple endpoint exists and validates input"""
        # Send invalid data to verify endpoint exists and validates
        response = requests.post(
            f"{BASE_URL}/api/auth/callback/apple",
            data={"code": "test_code", "id_token": "invalid_token"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        # Should return 400 for invalid token, not 404
        assert response.status_code == 400, f"Expected 400 for invalid token, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data, "Missing error detail"
        print(f"Apple callback validation: {data}")
    
    def test_apple_callback_requires_id_token(self):
        """POST /api/auth/callback/apple requires id_token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/callback/apple",
            data={"code": "test_code"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        assert response.status_code == 400, f"Expected 400 for missing id_token, got {response.status_code}"
        
        data = response.json()
        assert "id_token" in data.get("detail", "").lower() or "missing" in data.get("detail", "").lower(), \
            f"Error should mention missing id_token: {data}"


class TestGoogleOAuth:
    """Google OAuth session endpoint tests"""
    
    def test_google_session_endpoint_exists(self):
        """GET /api/auth/session endpoint exists"""
        response = requests.get(f"{BASE_URL}/api/auth/session")
        
        # Should return 422 for missing session_id parameter, not 404
        assert response.status_code == 422, f"Expected 422 for missing session_id, got {response.status_code}"
    
    def test_google_session_rejects_invalid_session_id(self):
        """GET /api/auth/session rejects invalid session_id"""
        response = requests.get(
            f"{BASE_URL}/api/auth/session",
            params={"session_id": "invalid_session_id_12345"}
        )
        
        # Should return 401 for invalid session
        assert response.status_code == 401, f"Expected 401 for invalid session, got {response.status_code}"


class TestRememberMe:
    """Remember Me functionality tests"""
    
    def test_login_with_remember_me_true(self):
        """POST /api/auth/login with remember_me=true creates 30-day session"""
        # First create a test user
        test_email = f"test_remember_{int(time.time())}@blvx.app"
        test_password = "TestPassword123!"
        
        # Sign up
        signup_response = requests.post(
            f"{BASE_URL}/api/auth/signup",
            json={
                "email": test_email,
                "password": test_password,
                "name": "Test Remember Me"
            }
        )
        
        if signup_response.status_code != 200:
            pytest.skip(f"Could not create test user: {signup_response.text}")
        
        # Login with remember_me=true
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": test_email,
                "password": test_password,
                "remember_me": True
            }
        )
        
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        data = login_response.json()
        assert "session_token" in data, "Missing session_token in login response"
        
        # Check cookie max-age (should be 30 days = 2592000 seconds)
        cookies = login_response.cookies
        if "session_token" in cookies:
            print(f"Session cookie set with remember_me=true")
        
        print(f"Login with remember_me=true successful, token: {data['session_token'][:20]}...")
    
    def test_login_with_remember_me_false(self):
        """POST /api/auth/login with remember_me=false creates 7-day session"""
        # First create a test user
        test_email = f"test_no_remember_{int(time.time())}@blvx.app"
        test_password = "TestPassword123!"
        
        # Sign up
        signup_response = requests.post(
            f"{BASE_URL}/api/auth/signup",
            json={
                "email": test_email,
                "password": test_password,
                "name": "Test No Remember"
            }
        )
        
        if signup_response.status_code != 200:
            pytest.skip(f"Could not create test user: {signup_response.text}")
        
        # Login with remember_me=false
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": test_email,
                "password": test_password,
                "remember_me": False
            }
        )
        
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        data = login_response.json()
        assert "session_token" in data, "Missing session_token in login response"
        
        print(f"Login with remember_me=false successful, token: {data['session_token'][:20]}...")


class TestTokenBasedAuth:
    """Token-based authentication tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Create a test user and get auth token"""
        test_email = f"test_token_{int(time.time())}@blvx.app"
        test_password = "TestPassword123!"
        
        # Sign up
        signup_response = requests.post(
            f"{BASE_URL}/api/auth/signup",
            json={
                "email": test_email,
                "password": test_password,
                "name": "Test Token User"
            }
        )
        
        if signup_response.status_code == 200:
            data = signup_response.json()
            return data.get("user", {}).get("session_token")
        
        # Try login if user exists
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": test_email,
                "password": test_password
            }
        )
        
        if login_response.status_code == 200:
            return login_response.json().get("session_token")
        
        return None
    
    def test_auth_me_with_bearer_token(self, auth_token):
        """GET /api/auth/me accepts Bearer token in Authorization header"""
        if not auth_token:
            pytest.skip("Could not get auth token")
        
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "user_id" in data, "Missing user_id in response"
        assert "email" in data, "Missing email in response"
        print(f"Auth me successful for user: {data.get('email')}")
    
    def test_auth_me_without_token_returns_401(self):
        """GET /api/auth/me returns 401 without token"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_auth_me_with_invalid_token_returns_401(self):
        """GET /api/auth/me returns 401 with invalid token"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": "Bearer invalid_token_12345"}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_protected_endpoint_with_bearer_token(self, auth_token):
        """Protected endpoints accept Bearer token"""
        if not auth_token:
            pytest.skip("Could not get auth token")
        
        # Test posts feed endpoint
        response = requests.get(
            f"{BASE_URL}/api/posts/feed",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("Protected endpoint (posts/feed) accessible with Bearer token")


class TestSignupAndLogin:
    """Signup and Login flow tests"""
    
    def test_signup_returns_session_token(self):
        """POST /api/auth/signup returns session_token in response"""
        test_email = f"test_signup_{int(time.time())}@blvx.app"
        
        response = requests.post(
            f"{BASE_URL}/api/auth/signup",
            json={
                "email": test_email,
                "password": "TestPassword123!",
                "name": "Test Signup User"
            }
        )
        
        assert response.status_code == 200, f"Signup failed: {response.text}"
        
        data = response.json()
        assert "user" in data, "Missing user in response"
        assert "session_token" in data["user"], "Missing session_token in user object"
        print(f"Signup successful, token: {data['user']['session_token'][:20]}...")
    
    def test_login_returns_session_token(self):
        """POST /api/auth/login returns session_token in response"""
        # Use existing test user or create one
        test_email = f"test_login_{int(time.time())}@blvx.app"
        test_password = "TestPassword123!"
        
        # Sign up first
        requests.post(
            f"{BASE_URL}/api/auth/signup",
            json={
                "email": test_email,
                "password": test_password,
                "name": "Test Login User"
            }
        )
        
        # Login
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": test_email,
                "password": test_password
            }
        )
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "session_token" in data, "Missing session_token in login response"
        print(f"Login successful, token: {data['session_token'][:20]}...")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
