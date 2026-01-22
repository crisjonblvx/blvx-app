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
    def __init__(self, base_url="https://blvx-context.preview.emergentagent.com"):
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

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, timeout=15):
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
                response = requests.get(url, headers=test_headers, timeout=timeout)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=timeout)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=timeout)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=timeout)

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
        """Create test user and session using pymongo"""
        self.log("Setting up test user and session...")
        
        try:
            from pymongo import MongoClient
            
            # Connect to MongoDB
            client = MongoClient("mongodb://localhost:27017")
            db = client.test_database
            
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
            
            # Insert documents
            db.users.insert_one(user_doc)
            db.user_sessions.insert_one(session_doc)
            
            self.log(f"✅ Test user created - ID: {self.user_id}")
            self.log(f"✅ Session token: {self.session_token}")
            
            # Verify insertion
            user_count = db.users.count_documents({"user_id": self.user_id})
            session_count = db.user_sessions.count_documents({"session_token": self.session_token})
            self.log(f"✅ Verification - User: {user_count}, Session: {session_count}")
            
            client.close()
            return True
            
        except ImportError:
            self.log("❌ pymongo not available, falling back to mongosh")
            return self.setup_test_user_mongosh()
        except Exception as e:
            self.log(f"❌ MongoDB setup error: {str(e)}")
            return False

    def setup_test_user_mongosh(self):
        """Fallback method using mongosh"""
        try:
            import subprocess
            
            timestamp = int(time.time())
            self.user_id = f"test_user_{timestamp}"
            self.session_token = f"test_session_{timestamp}"
            
            # Simple mongosh command
            cmd = f'''mongosh --eval "
            use test_database;
            db.users.insertOne({{
                user_id: '{self.user_id}',
                email: 'test.user.{timestamp}@example.com',
                name: 'Test User BLVX',
                picture: 'https://via.placeholder.com/150',
                username: 'testuser{timestamp}',
                bio: 'Test bio for BLVX testing',
                verified: false,
                followers_count: 0,
                following_count: 0,
                posts_count: 0,
                created_at: new Date().toISOString()
            }});
            db.user_sessions.insertOne({{
                user_id: '{self.user_id}',
                session_token: '{self.session_token}',
                expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
                created_at: new Date().toISOString()
            }});
            print('Setup complete');
            "'''
            
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0 and "Setup complete" in result.stdout:
                self.log(f"✅ Test user created - ID: {self.user_id}")
                self.log(f"✅ Session token: {self.session_token}")
                return True
            else:
                self.log(f"❌ Failed to create test user: {result.stderr}")
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

    def test_create_post_with_visibility(self):
        """Test creating posts with different visibility settings"""
        # Test Block (public) post
        block_post_data = {
            "content": "This is a public Block post! 🌍",
            "post_type": "original",
            "visibility": "block"
        }
        success1, response1 = self.run_test("Create Block Post", "POST", "posts", 201, block_post_data)
        
        # Test Cookout (private) post
        cookout_post_data = {
            "content": "This is a private Cookout post! 🏠",
            "post_type": "original", 
            "visibility": "cookout"
        }
        success2, response2 = self.run_test("Create Cookout Post", "POST", "posts", 201, cookout_post_data)
        
        if success1 and response1.get('post_id'):
            self.test_post_id = response1['post_id']
            self.log(f"✅ Created test Block post: {self.test_post_id}")
            
        return success1 and success2, response1

    def test_vouch_system(self):
        """Test The Vouch (Plates) system"""
        # Create a plate
        success1, plate_response = self.run_test("Create Plate", "POST", "vouch/plate/create", 200)
        
        if not success1:
            return False, {}
            
        # Get my plates
        success2, _ = self.run_test("Get My Plates", "GET", "vouch/plate/my-plates", 200)
        
        return success1 and success2, plate_response

    def test_gc_system(self):
        """Test The GC (Group Chat) system"""
        # Create a GC (need at least 2 other members, using fake IDs for test)
        gc_data = {
            "name": "Test GC Chat",
            "member_ids": ["fake_user_1", "fake_user_2"]
        }
        success1, gc_response = self.run_test("Create GC", "POST", "gc/create", 200, gc_data)
        
        # Get my GCs
        success2, _ = self.run_test("Get My GCs", "GET", "gc/my-gcs", 200)
        
        # Test sending a message if GC was created
        if success1 and gc_response.get('gc_id'):
            gc_id = gc_response['gc_id']
            success3, _ = self.run_test("Send GC Message", "POST", f"gc/{gc_id}/message?content=Test message", 200)
            return success1 and success2 and success3, gc_response
            
        return success1 and success2, gc_response

    def test_stoop_system(self):
        """Test The Stoop (Audio Rooms) system"""
        # Create a Stoop
        stoop_data = {
            "title": "Test Audio Room",
            "pinned_post_id": None
        }
        success1, stoop_response = self.run_test("Create Stoop", "POST", "stoop/create", 200, stoop_data)
        
        # Get live Stoops
        success2, _ = self.run_test("Get Live Stoops", "GET", "stoop/live", 200)
        
        # Test joining the Stoop if it was created
        if success1 and stoop_response.get('stoop_id'):
            stoop_id = stoop_response['stoop_id']
            success3, _ = self.run_test("Join Stoop", "POST", f"stoop/{stoop_id}/join", 200)
            return success1 and success2 and success3, stoop_response
            
        return success1 and success2, stoop_response

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
        """Test Bonita AI endpoint with different modes"""
        # Test conversation mode
        bonita_data = {
            "mode": "conversation",
            "content": "What does 'periodt' mean in this context?",
            "context": "block"
        }
        success1, _ = self.run_test("Bonita AI - Conversation", "POST", "bonita/ask", 200, bonita_data)
        
        # Test vibe_check mode
        bonita_data = {
            "mode": "vibe_check", 
            "content": "This post is fire! Everyone needs to see this.",
            "context": "cookout"
        }
        success2, _ = self.run_test("Bonita AI - Vibe Check", "POST", "bonita/ask", 200, bonita_data)
        
        # Test tone_rewrite mode
        bonita_data = {
            "mode": "tone_rewrite",
            "content": "You're completely wrong about this topic.",
            "context": "block"
        }
        success3, _ = self.run_test("Bonita AI - Tone Rewrite", "POST", "bonita/ask", 200, bonita_data)
        
        return success1 and success2 and success3, {}

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
            ("Create Posts with Visibility", self.test_create_post_with_visibility),
            ("Vouch System (Plates)", self.test_vouch_system),
            ("GC System (Group Chat)", self.test_gc_system),
            ("Stoop System (Audio Rooms)", self.test_stoop_system),
            ("Get Feed", self.test_get_feed),
            ("Get Explore Feed", self.test_get_explore_feed),
            ("Like Post", self.test_like_post),
            ("User Profile", self.test_get_user_profile),
            ("Search Users", self.test_search_users),
            ("Notifications", self.test_notifications),
            ("Bonita AI (All Modes)", self.test_bonita_ai),
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