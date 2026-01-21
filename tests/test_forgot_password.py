"""
Test suite for Forgot Password feature in BLVX
Tests:
- /api/auth/forgot-password endpoint
- /api/auth/reset-password endpoint
- Token validation and expiration
- Password reset flow
"""
import pytest
import requests
import os
import time
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://high-context-1.preview.emergentagent.com')

class TestForgotPasswordAPI:
    """Test forgot password and reset password API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.test_email = "fresh@blvx.app"  # Existing test user
        self.test_password = "testpassword123"
    
    def test_forgot_password_existing_user(self):
        """Test forgot password for existing user returns success"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/forgot-password",
            params={"email": self.test_email}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Should return success message (doesn't reveal if email exists for security)
        assert "message" in data
        assert "reset link" in data["message"].lower() or "account exists" in data["message"].lower()
        print(f"✓ Forgot password for existing user: {data['message']}")
    
    def test_forgot_password_nonexistent_user(self):
        """Test forgot password for non-existent user (should not reveal if email exists)"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/forgot-password",
            params={"email": "nonexistent_user_12345@example.com"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Should return same message for security (doesn't reveal if email exists)
        assert "message" in data
        print(f"✓ Forgot password for non-existent user: {data['message']}")
    
    def test_forgot_password_invalid_email_format(self):
        """Test forgot password with invalid email format"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/forgot-password",
            params={"email": "not-an-email"}
        )
        
        # Should return 422 for validation error
        assert response.status_code == 422, f"Expected 422, got {response.status_code}: {response.text}"
        print(f"✓ Invalid email format rejected with 422")
    
    def test_reset_password_invalid_token(self):
        """Test reset password with invalid token"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/reset-password",
            params={
                "token": "invalid_token_12345",
                "new_password": "newpassword123"
            }
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data
        assert "invalid" in data["detail"].lower() or "expired" in data["detail"].lower()
        print(f"✓ Invalid token rejected: {data['detail']}")
    
    def test_reset_password_short_password(self):
        """Test reset password with password less than 8 characters"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/reset-password",
            params={
                "token": "some_token",
                "new_password": "short"
            }
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data
        assert "8 characters" in data["detail"]
        print(f"✓ Short password rejected: {data['detail']}")
    
    def test_forgot_password_google_oauth_user(self):
        """Test forgot password for Google OAuth user (no password_hash)"""
        # First, let's check if there's a Google OAuth user
        # This test verifies the endpoint handles OAuth users gracefully
        response = self.session.post(
            f"{BASE_URL}/api/auth/forgot-password",
            params={"email": "oauth_test@gmail.com"}
        )
        
        # Should return 200 with appropriate message
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"✓ OAuth user handled: {data['message']}")


class TestResetPasswordFlow:
    """Test the complete password reset flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_full_reset_flow_with_valid_token(self):
        """Test complete password reset flow by creating a token in DB"""
        import subprocess
        import json
        
        # Create a test reset token directly in MongoDB
        test_email = "fresh@blvx.app"
        test_token = f"test_reset_token_{int(time.time())}"
        expires_at = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        
        # Insert token into database
        mongo_cmd = f'''
        mongosh --quiet --eval "
        use('test_database');
        db.password_resets.deleteMany({{email: '{test_email}'}});
        db.password_resets.insertOne({{
            email: '{test_email}',
            token: '{test_token}',
            created_at: new Date().toISOString(),
            expires_at: '{expires_at}'
        }});
        print('Token created');
        "
        '''
        
        result = subprocess.run(mongo_cmd, shell=True, capture_output=True, text=True)
        print(f"MongoDB insert result: {result.stdout}")
        
        # Now test the reset password endpoint with valid token
        new_password = "newpassword123"
        response = self.session.post(
            f"{BASE_URL}/api/auth/reset-password",
            params={
                "token": test_token,
                "new_password": new_password
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        assert "successful" in data["message"].lower()
        print(f"✓ Password reset successful: {data['message']}")
        
        # Verify we can login with new password
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": test_email,
                "password": new_password
            }
        )
        
        assert login_response.status_code == 200, f"Login failed after reset: {login_response.text}"
        print(f"✓ Login with new password successful")
        
        # Reset password back to original for other tests
        reset_back_cmd = f'''
        mongosh --quiet --eval "
        use('test_database');
        db.password_resets.deleteMany({{email: '{test_email}'}});
        db.password_resets.insertOne({{
            email: '{test_email}',
            token: 'reset_back_token',
            created_at: new Date().toISOString(),
            expires_at: '{expires_at}'
        }});
        "
        '''
        subprocess.run(reset_back_cmd, shell=True, capture_output=True, text=True)
        
        # Reset to original password
        self.session.post(
            f"{BASE_URL}/api/auth/reset-password",
            params={
                "token": "reset_back_token",
                "new_password": "testpassword123"
            }
        )
        print(f"✓ Password reset back to original")
    
    def test_expired_token_rejected(self):
        """Test that expired tokens are rejected"""
        import subprocess
        
        test_email = "fresh@blvx.app"
        test_token = f"expired_token_{int(time.time())}"
        # Set expiration to 1 hour ago
        expires_at = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
        
        # Insert expired token
        mongo_cmd = f'''
        mongosh --quiet --eval "
        use('test_database');
        db.password_resets.insertOne({{
            email: '{test_email}',
            token: '{test_token}',
            created_at: new Date().toISOString(),
            expires_at: '{expires_at}'
        }});
        "
        '''
        subprocess.run(mongo_cmd, shell=True, capture_output=True, text=True)
        
        # Try to use expired token
        response = self.session.post(
            f"{BASE_URL}/api/auth/reset-password",
            params={
                "token": test_token,
                "new_password": "newpassword123"
            }
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "expired" in data["detail"].lower()
        print(f"✓ Expired token rejected: {data['detail']}")
        
        # Cleanup
        cleanup_cmd = f'''
        mongosh --quiet --eval "
        use('test_database');
        db.password_resets.deleteOne({{token: '{test_token}'}});
        "
        '''
        subprocess.run(cleanup_cmd, shell=True, capture_output=True, text=True)
    
    def test_token_deleted_after_use(self):
        """Test that token is deleted after successful password reset"""
        import subprocess
        
        test_email = "fresh@blvx.app"
        test_token = f"single_use_token_{int(time.time())}"
        expires_at = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        
        # Insert token
        mongo_cmd = f'''
        mongosh --quiet --eval "
        use('test_database');
        db.password_resets.insertOne({{
            email: '{test_email}',
            token: '{test_token}',
            created_at: new Date().toISOString(),
            expires_at: '{expires_at}'
        }});
        "
        '''
        subprocess.run(mongo_cmd, shell=True, capture_output=True, text=True)
        
        # Use the token
        response = self.session.post(
            f"{BASE_URL}/api/auth/reset-password",
            params={
                "token": test_token,
                "new_password": "temppassword123"
            }
        )
        assert response.status_code == 200
        
        # Try to use the same token again
        response2 = self.session.post(
            f"{BASE_URL}/api/auth/reset-password",
            params={
                "token": test_token,
                "new_password": "anotherpassword123"
            }
        )
        
        assert response2.status_code == 400, f"Token should be invalid after use: {response2.text}"
        print(f"✓ Token deleted after use - second attempt rejected")
        
        # Reset password back to original
        reset_cmd = f'''
        mongosh --quiet --eval "
        use('test_database');
        db.password_resets.insertOne({{
            email: '{test_email}',
            token: 'final_reset_token',
            created_at: new Date().toISOString(),
            expires_at: '{expires_at}'
        }});
        "
        '''
        subprocess.run(reset_cmd, shell=True, capture_output=True, text=True)
        
        self.session.post(
            f"{BASE_URL}/api/auth/reset-password",
            params={
                "token": "final_reset_token",
                "new_password": "testpassword123"
            }
        )


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
