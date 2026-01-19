#!/usr/bin/env python3
"""
BLVX Backend API Testing Suite
Tests all API endpoints for the Black-first social network
"""

import requests
import sys
import json
import time
from datetime import datetime, timedelta

class BLVXAPITester:
    def __init__(self, base_url="https://blackvoices-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.session_token = None
        self.user_id = None
        self.test_post_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log(self, message, level="INFO"):
        """Log test messages"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.session_token:
            test_headers['Authorization'] = f'Bearer {self.session_token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        self.log(f"Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
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

    def setup_test_user(self):
        """Create test user and session using MongoDB directly"""
        self.log("Setting up test user and session...")
        
        # Generate unique identifiers
        timestamp = int(time.time())
        self.user_id = f"test_user_{timestamp}"
        self.session_token = f"test_session_{timestamp}"
        
        # Create test user document
        user_doc = {
            "user_id": self.user_id,
            "email": f"test.user.{timestamp}@example.com",
            "name": "Test User BLVX",
            "picture": "https://via.placeholder.com/150",
            "username": f"testuser{timestamp}",
            "bio": "Test bio for BLVX testing",
            "verified": False,
            "followers_count": 0,
            "following_count": 0,
            "posts_count": 0,
            "created_at": datetime.now().isoformat()
        }
        
        # Create session document
        session_doc = {
            "user_id": self.user_id,
            "session_token": self.session_token,
            "expires_at": (datetime.now() + timedelta(days=7)).isoformat(),
            "created_at": datetime.now().isoformat()
        }
        
        try:
            import subprocess
            
            # Insert user
            user_cmd = f'mongosh --eval "use test_database; db.users.insertOne({json.dumps(user_doc)});"'
            result1 = subprocess.run(user_cmd, shell=True, capture_output=True, text=True, timeout=30)
            
            # Insert session
            session_cmd = f'mongosh --eval "use test_database; db.user_sessions.insertOne({json.dumps(session_doc)});"'
            result2 = subprocess.run(session_cmd, shell=True, capture_output=True, text=True, timeout=30)
            
            if result1.returncode == 0 and result2.returncode == 0:
                self.log(f"✅ Test user created - ID: {self.user_id}")
                self.log(f"✅ Session token: {self.session_token}")
                
                # Verify the data was inserted
                verify_cmd = f'mongosh --eval "use test_database; print(\\"Users:\\"); db.users.find({{user_id: \\"{self.user_id}\\"}}).pretty(); print(\\"Sessions:\\"); db.user_sessions.find({{session_token: \\"{self.session_token}\\"}}).pretty();"'
                verify_result = subprocess.run(verify_cmd, shell=True, capture_output=True, text=True, timeout=30)
                self.log(f"Database verification: {verify_result.stdout}")
                
                return True
            else:
                self.log(f"❌ Failed to create test user")
                self.log(f"User insert result: {result1.stderr}")
                self.log(f"Session insert result: {result2.stderr}")
                return False
                
        except Exception as e:
            self.log(f"❌ MongoDB setup error: {str(e)}")
            return False

    def cleanup_test_data(self):
        """Clean up test data from MongoDB"""
        self.log("Cleaning up test data...")
        
        mongo_commands = f'''
        use test_database;
        db.users.deleteMany({{"user_id": "{self.user_id}"}});
        db.user_sessions.deleteMany({{"session_token": "{self.session_token}"}});
        db.posts.deleteMany({{"user_id": "{self.user_id}"}});
        db.likes.deleteMany({{"user_id": "{self.user_id}"}});
        db.follows.deleteMany({{"follower_id": "{self.user_id}"}});
        db.notifications.deleteMany({{"user_id": "{self.user_id}"}});
        '''
        
        try:
            import subprocess
            subprocess.run(['mongosh', '--eval', mongo_commands], timeout=30)
            self.log("✅ Test data cleaned up")
        except Exception as e:
            self.log(f"⚠️  Cleanup warning: {str(e)}")

    def test_health_check(self):
        """Test health check endpoint"""
        return self.run_test("Health Check", "GET", "health", 200)

    def test_auth_me(self):
        """Test getting current user"""
        return self.run_test("Get Current User", "GET", "auth/me", 200)

    def test_create_post(self):
        """Test creating a post"""
        post_data = {
            "content": "This is a test BLVX post from the testing suite! 🚀",
            "post_type": "original"
        }
        success, response = self.run_test("Create Post", "POST", "posts", 201, post_data)
        if success and response.get('post_id'):
            self.test_post_id = response['post_id']
            self.log(f"✅ Created test post: {self.test_post_id}")
        return success, response

    def test_get_feed(self):
        """Test getting user feed"""
        return self.run_test("Get Feed", "GET", "posts/feed", 200)

    def test_get_explore_feed(self):
        """Test getting explore feed"""
        return self.run_test("Get Explore Feed", "GET", "posts/explore", 200)

    def test_like_post(self):
        """Test liking a post"""
        if not self.test_post_id:
            self.log("⚠️  Skipping like test - no test post available")
            return False, {}
        return self.run_test("Like Post", "POST", f"posts/{self.test_post_id}/like", 200)

    def test_get_user_profile(self):
        """Test getting user profile"""
        if not self.user_id:
            return False, {}
        
        # First get the username from the user
        success, user_data = self.test_auth_me()
        if success and user_data.get('username'):
            username = user_data['username']
            return self.run_test("Get User Profile", "GET", f"users/profile/{username}", 200)
        return False, {}

    def test_search_users(self):
        """Test user search"""
        return self.run_test("Search Users", "GET", "users/search?q=test", 200)

    def test_notifications(self):
        """Test getting notifications"""
        return self.run_test("Get Notifications", "GET", "notifications", 200)

    def test_bonita_ai(self):
        """Test Bonita AI endpoint"""
        bonita_data = {
            "prompt_type": "cultural_context",
            "content": "What does 'periodt' mean in this context?"
        }
        return self.run_test("Bonita AI", "POST", "bonita/ask", 200, bonita_data)

    def run_all_tests(self):
        """Run all API tests"""
        self.log("🚀 Starting BLVX API Test Suite")
        self.log(f"Backend URL: {self.base_url}")
        
        # Setup
        if not self.setup_test_user():
            self.log("❌ Failed to setup test user, aborting tests")
            return False

        # Test sequence
        tests = [
            ("Health Check", self.test_health_check),
            ("Authentication", self.test_auth_me),
            ("Create Post", self.test_create_post),
            ("Get Feed", self.test_get_feed),
            ("Get Explore Feed", self.test_get_explore_feed),
            ("Like Post", self.test_like_post),
            ("User Profile", self.test_get_user_profile),
            ("Search Users", self.test_search_users),
            ("Notifications", self.test_notifications),
            ("Bonita AI", self.test_bonita_ai),
        ]

        for test_name, test_func in tests:
            try:
                test_func()
                time.sleep(0.5)  # Brief pause between tests
            except Exception as e:
                self.log(f"❌ {test_name} failed with exception: {str(e)}")

        # Cleanup
        self.cleanup_test_data()

        # Results
        self.log("\n" + "="*50)
        self.log("📊 TEST RESULTS")
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
    tester = BLVXAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())