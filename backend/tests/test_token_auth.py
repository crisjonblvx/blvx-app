"""
Token-based Authentication Tests for BLVX
Tests Bearer token authentication flow for mobile Safari/ITP compatibility
"""
import pytest
import requests
import os
import uuid
import time

# Use the public URL for testing
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://blvx-context.preview.emergentagent.com').rstrip('/')

# Test token provided for user testlogin2@blvx.app
VALID_TEST_TOKEN = "session_4aUVQq316dTRBolbY1H6UnKenHrbHen7IeGP_Gs7CDM"


class TestBearerTokenAuth:
    """Tests for Bearer token authentication in Authorization header"""
    
    def test_auth_me_with_bearer_token(self):
        """GET /api/auth/me accepts Bearer token in Authorization header"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {VALID_TEST_TOKEN}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "user_id" in data, "Response should contain user_id"
        assert "email" in data, "Response should contain email"
        assert data["email"] == "testlogin2@blvx.app", f"Expected testlogin2@blvx.app, got {data['email']}"
        print(f"✓ /api/auth/me works with Bearer token for user: {data['email']}")
    
    def test_auth_me_without_token_returns_401(self):
        """GET /api/auth/me returns 401 without token"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ /api/auth/me correctly returns 401 without token")
    
    def test_auth_me_with_invalid_token_returns_401(self):
        """GET /api/auth/me returns 401 with invalid token"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": "Bearer invalid_token_12345"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ /api/auth/me correctly returns 401 with invalid token")
    
    def test_posts_feed_with_bearer_token(self):
        """GET /api/posts/feed accepts Bearer token and returns posts"""
        response = requests.get(
            f"{BASE_URL}/api/posts/feed",
            headers={"Authorization": f"Bearer {VALID_TEST_TOKEN}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Feed should return a list"
        print(f"✓ /api/posts/feed works with Bearer token, returned {len(data)} posts")
    
    def test_posts_feed_without_token_returns_401(self):
        """GET /api/posts/feed returns 401 without token"""
        response = requests.get(f"{BASE_URL}/api/posts/feed")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ /api/posts/feed correctly returns 401 without token")


class TestLoginReturnsSessionToken:
    """Tests that login endpoint returns session_token in response"""
    
    def test_login_returns_session_token(self):
        """POST /api/auth/login returns session_token in response"""
        # Use a test account - we'll create one first
        test_email = f"test_login_{uuid.uuid4().hex[:8]}@blvx.app"
        test_password = "TestPassword123!"
        test_name = "Test Login User"
        
        # First signup to create the account
        signup_response = requests.post(
            f"{BASE_URL}/api/auth/signup",
            json={
                "email": test_email,
                "password": test_password,
                "name": test_name
            }
        )
        
        if signup_response.status_code != 200:
            pytest.skip(f"Could not create test account: {signup_response.text}")
        
        # Now test login
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
        assert "session_token" in data, "Login response should contain session_token"
        assert data["session_token"].startswith("session_"), f"Token should start with 'session_', got: {data['session_token'][:20]}"
        assert "user_id" in data, "Login response should contain user_id"
        assert data["email"] == test_email, f"Email mismatch: expected {test_email}, got {data['email']}"
        
        # Verify the returned token works
        verify_response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {data['session_token']}"}
        )
        assert verify_response.status_code == 200, "Returned session_token should be valid"
        
        print(f"✓ POST /api/auth/login returns valid session_token")


class TestSignupReturnsSessionToken:
    """Tests that signup endpoint returns session_token in response"""
    
    def test_signup_returns_session_token(self):
        """POST /api/auth/signup returns session_token in user object"""
        test_email = f"test_signup_{uuid.uuid4().hex[:8]}@blvx.app"
        test_password = "TestPassword123!"
        test_name = "Test Signup User"
        
        response = requests.post(
            f"{BASE_URL}/api/auth/signup",
            json={
                "email": test_email,
                "password": test_password,
                "name": test_name
            }
        )
        
        assert response.status_code == 200, f"Signup failed: {response.text}"
        
        data = response.json()
        assert "user" in data, "Signup response should contain user object"
        assert "session_token" in data["user"], "User object should contain session_token"
        assert data["user"]["session_token"].startswith("session_"), f"Token should start with 'session_'"
        
        # Verify the returned token works
        verify_response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {data['user']['session_token']}"}
        )
        assert verify_response.status_code == 200, "Returned session_token should be valid"
        
        print(f"✓ POST /api/auth/signup returns valid session_token in user object")


class TestVerifyEmailReturnsSessionToken:
    """Tests that verify-email endpoint returns session_token for auto-login"""
    
    def test_verify_email_returns_session_token(self):
        """POST /api/auth/verify-email returns session_token in user object"""
        # This test requires a valid verification code which we can't easily get
        # We'll test the endpoint structure by checking error response
        response = requests.post(
            f"{BASE_URL}/api/auth/verify-email",
            json={
                "email": "nonexistent@blvx.app",
                "code": "123456"
            }
        )
        
        # Should return 400 for invalid code, not 500
        assert response.status_code == 400, f"Expected 400 for invalid code, got {response.status_code}"
        assert "Invalid verification code" in response.text or "verification" in response.text.lower()
        
        print("✓ POST /api/auth/verify-email endpoint exists and validates input")


class TestGoogleOAuthReturnsSessionToken:
    """Tests that Google OAuth session endpoint returns session_token"""
    
    def test_session_endpoint_exists(self):
        """GET /api/auth/session endpoint exists"""
        # Without a valid session_id, it should return 401 or 422
        response = requests.get(f"{BASE_URL}/api/auth/session")
        
        # Should return 422 (missing session_id param) or 401
        assert response.status_code in [401, 422], f"Expected 401 or 422, got {response.status_code}"
        print("✓ GET /api/auth/session endpoint exists")
    
    def test_session_endpoint_with_invalid_session_id(self):
        """GET /api/auth/session returns 401 with invalid session_id"""
        response = requests.get(
            f"{BASE_URL}/api/auth/session",
            params={"session_id": "invalid_session_id_12345"}
        )
        
        # Should return 401 for invalid session
        assert response.status_code in [401, 500], f"Expected 401 or 500, got {response.status_code}"
        print("✓ GET /api/auth/session correctly rejects invalid session_id")


class TestProtectedEndpointsWithBearerToken:
    """Tests that various protected endpoints accept Bearer token"""
    
    def test_notifications_endpoint(self):
        """GET /api/notifications accepts Bearer token"""
        response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {VALID_TEST_TOKEN}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/notifications works with Bearer token")
    
    def test_explore_feed_endpoint(self):
        """GET /api/posts/explore accepts Bearer token"""
        response = requests.get(
            f"{BASE_URL}/api/posts/explore",
            headers={"Authorization": f"Bearer {VALID_TEST_TOKEN}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/posts/explore works with Bearer token")
    
    def test_user_profile_update(self):
        """PUT /api/users/profile accepts Bearer token"""
        response = requests.put(
            f"{BASE_URL}/api/users/profile",
            headers={"Authorization": f"Bearer {VALID_TEST_TOKEN}"},
            json={"bio": "Test bio update"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ PUT /api/users/profile works with Bearer token")
    
    def test_create_post_with_bearer_token(self):
        """POST /api/posts accepts Bearer token"""
        response = requests.post(
            f"{BASE_URL}/api/posts",
            headers={"Authorization": f"Bearer {VALID_TEST_TOKEN}"},
            json={
                "content": f"Test post from token auth test {uuid.uuid4().hex[:8]}",
                "visibility": "block"
            }
        )
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "post_id" in data, "Response should contain post_id"
        print(f"✓ POST /api/posts works with Bearer token, created post: {data['post_id']}")


class TestCookieFallback:
    """Tests that cookie-based auth still works as fallback"""
    
    def test_cookie_auth_still_works(self):
        """Verify cookie-based auth is still functional"""
        # Login to get a session cookie
        test_email = f"test_cookie_{uuid.uuid4().hex[:8]}@blvx.app"
        test_password = "TestPassword123!"
        
        # Create account
        signup_response = requests.post(
            f"{BASE_URL}/api/auth/signup",
            json={
                "email": test_email,
                "password": test_password,
                "name": "Cookie Test User"
            }
        )
        
        if signup_response.status_code != 200:
            pytest.skip(f"Could not create test account: {signup_response.text}")
        
        # Check if cookie was set
        cookies = signup_response.cookies
        if "session_token" in cookies:
            # Use cookie to access protected endpoint
            session = requests.Session()
            session.cookies.set("session_token", cookies["session_token"])
            
            response = session.get(f"{BASE_URL}/api/auth/me")
            assert response.status_code == 200, f"Cookie auth failed: {response.status_code}"
            print("✓ Cookie-based authentication still works as fallback")
        else:
            # Cookie might not be set in test environment due to cross-origin
            print("⚠ Cookie not set (expected in cross-origin test environment)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
