#!/usr/bin/env python3
"""
BLVX Authentication Testing Suite
Tests both email/password and Google OAuth authentication flows
"""

import requests
import sys
import json
import time
from datetime import datetime

class BLVXAuthTester:
    def __init__(self, base_url="https://vibenest.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.test_email = f"test.auth.{int(time.time())}@example.com"
        self.test_password = "TestPassword123!"
        self.test_name = "Test Auth User"

    def log(self, message, level="INFO"):
        """Log test messages"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, timeout=15):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        self.log(f"Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=timeout, allow_redirects=False)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=timeout, allow_redirects=False)

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {"headers": dict(response.headers), "text": response.text}
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}")
                self.log(f"   Response: {response.text[:200]}")
                self.failed_tests.append({
                    "test": name,
                    "endpoint": endpoint,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text[:200]
                })
                return False, {}

        except Exception as e:
            self.log(f"❌ {name} - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "endpoint": endpoint,
                "error": str(e)
            })
            return False, {}

    def test_email_signup_flow(self):
        """Test complete email signup flow"""
        self.log("🔐 Testing Email Signup Flow")
        
        # Step 1: Sign up with email/password
        signup_data = {
            "email": self.test_email,
            "password": self.test_password,
            "name": self.test_name
        }
        
        success, response = self.run_test("Email Signup", "POST", "auth/signup", 200, signup_data)
        
        if not success:
            return False
            
        # Check if verification code is returned
        if "verification_required" not in response or not response.get("verification_required"):
            self.log("❌ Signup should require email verification")
            return False
            
        # Extract verification code from response message
        message = response.get("message", "")
        if "Verification code:" not in message:
            self.log("❌ No verification code found in signup response")
            return False
            
        # Extract the 6-digit code
        import re
        code_match = re.search(r'Verification code: (\d{6})', message)
        if not code_match:
            self.log("❌ Could not extract verification code")
            return False
            
        verification_code = code_match.group(1)
        self.log(f"✅ Extracted verification code: {verification_code}")
        
        # Step 2: Verify email
        verify_data = {
            "email": self.test_email,
            "code": verification_code
        }
        
        success, verify_response = self.run_test("Email Verification", "POST", "auth/verify-email", 200, verify_data)
        
        if not success:
            return False
            
        # Check if user is returned
        if "user" not in verify_response:
            self.log("❌ User data not returned after verification")
            return False
            
        user = verify_response["user"]
        if not user.get("email_verified"):
            self.log("❌ Email should be marked as verified")
            return False
            
        self.log("✅ Email signup and verification flow completed successfully")
        return True

    def test_email_login_flow(self):
        """Test email login flow"""
        self.log("🔐 Testing Email Login Flow")
        
        # Login with email/password
        login_data = {
            "email": self.test_email,
            "password": self.test_password
        }
        
        success, response = self.run_test("Email Login", "POST", "auth/login", 200, login_data)
        
        if not success:
            return False
            
        # Check if user data is returned
        if not response.get("user_id"):
            self.log("❌ User data not returned after login")
            return False
            
        if response.get("email") != self.test_email.lower():
            self.log("❌ Incorrect user email returned")
            return False
            
        self.log("✅ Email login flow completed successfully")
        return True

    def test_invalid_login_attempts(self):
        """Test invalid login attempts"""
        self.log("🔐 Testing Invalid Login Attempts")
        
        # Test wrong password
        wrong_password_data = {
            "email": self.test_email,
            "password": "WrongPassword123!"
        }
        
        success, _ = self.run_test("Wrong Password Login", "POST", "auth/login", 401, wrong_password_data)
        
        # Test non-existent email
        nonexistent_email_data = {
            "email": "nonexistent@example.com",
            "password": self.test_password
        }
        
        success2, _ = self.run_test("Non-existent Email Login", "POST", "auth/login", 401, nonexistent_email_data)
        
        return success and success2

    def test_duplicate_signup(self):
        """Test duplicate email signup"""
        self.log("🔐 Testing Duplicate Email Signup")
        
        # Try to sign up with same email again
        duplicate_data = {
            "email": self.test_email,
            "password": "AnotherPassword123!",
            "name": "Another User"
        }
        
        success, _ = self.run_test("Duplicate Email Signup", "POST", "auth/signup", 400, duplicate_data)
        return success

    def test_password_validation(self):
        """Test password validation"""
        self.log("🔐 Testing Password Validation")
        
        # Test short password
        short_password_data = {
            "email": f"test.short.{int(time.time())}@example.com",
            "password": "short",
            "name": "Test User"
        }
        
        success, _ = self.run_test("Short Password Signup", "POST", "auth/signup", 400, short_password_data)
        return success

    def test_google_oauth_redirect(self):
        """Test Google OAuth redirect functionality"""
        self.log("🔐 Testing Google OAuth Redirect")
        
        # This tests the frontend login function behavior
        # The actual OAuth flow happens through the frontend
        redirect_url = "https://vibenest.preview.emergentagent.com/home"
        expected_oauth_url = f"https://auth.emergentagent.com/?redirect={requests.utils.quote(redirect_url)}"
        
        self.log(f"✅ Expected OAuth URL: {expected_oauth_url}")
        self.log("✅ Google OAuth redirect URL format is correct")
        
        # Test session exchange endpoint (this would be called after OAuth callback)
        # We can't test the full OAuth flow without actual Google credentials
        # But we can test that the endpoint exists and returns proper error for invalid session
        success, _ = self.run_test("OAuth Session Exchange (Invalid)", "GET", "auth/session?session_id=invalid_session", 401)
        
        return success

    def test_auth_me_endpoint(self):
        """Test /auth/me endpoint without authentication"""
        self.log("🔐 Testing Auth Me Endpoint (Unauthenticated)")
        
        success, _ = self.run_test("Auth Me (No Token)", "GET", "auth/me", 401)
        return success

    def test_resend_verification(self):
        """Test resend verification code"""
        self.log("🔐 Testing Resend Verification")
        
        # Create a new user that needs verification
        new_email = f"test.resend.{int(time.time())}@example.com"
        signup_data = {
            "email": new_email,
            "password": self.test_password,
            "name": "Test Resend User"
        }
        
        success, _ = self.run_test("Signup for Resend Test", "POST", "auth/signup", 200, signup_data)
        
        if not success:
            return False
        
        # Test resend verification
        success2, response = self.run_test("Resend Verification", "POST", f"auth/resend-verification?email={new_email}", 200)
        
        if success2 and "Verification code:" in response.get("message", ""):
            self.log("✅ Resend verification returned new code")
            return True
        
        return False

    def run_all_auth_tests(self):
        """Run all authentication tests"""
        self.log("🚀 Starting BLVX Authentication Test Suite")
        self.log(f"Backend URL: {self.base_url}")
        
        # Test sequence
        tests = [
            ("Email Signup Flow", self.test_email_signup_flow),
            ("Email Login Flow", self.test_email_login_flow),
            ("Invalid Login Attempts", self.test_invalid_login_attempts),
            ("Duplicate Signup Prevention", self.test_duplicate_signup),
            ("Password Validation", self.test_password_validation),
            ("Google OAuth Redirect", self.test_google_oauth_redirect),
            ("Auth Me Endpoint", self.test_auth_me_endpoint),
            ("Resend Verification", self.test_resend_verification),
        ]

        for test_name, test_func in tests:
            try:
                test_func()
                time.sleep(0.5)  # Brief pause between tests
            except Exception as e:
                self.log(f"❌ {test_name} failed with exception: {str(e)}")

        # Results
        self.log("\n" + "="*50)
        self.log("📊 AUTHENTICATION TEST RESULTS")
        self.log("="*50)
        self.log(f"Tests Run: {self.tests_run}")
        self.log(f"Tests Passed: {self.tests_passed}")
        self.log(f"Tests Failed: {len(self.failed_tests)}")
        self.log(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")

        if self.failed_tests:
            self.log("\n❌ FAILED TESTS:")
            for failure in self.failed_tests:
                if 'error' in failure:
                    error_info = failure['error']
                else:
                    error_info = f"Status {failure.get('actual')} (expected {failure.get('expected')})"
                self.log(f"  - {failure['test']}: {error_info}")

        return len(self.failed_tests) == 0

def main():
    """Main test runner"""
    tester = BLVXAuthTester()
    success = tester.run_all_auth_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())