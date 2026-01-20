"""
Test Suite for The Stoop (LiveKit Audio Rooms) - Iteration 9
Tests LiveKit token generation, Stoop CRUD operations, and integration
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "stooptest@blvx.app"
TEST_PASSWORD = "testpass123"

class TestStoopLiveKit:
    """Tests for The Stoop with LiveKit integration"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.stoop_id = None
        yield
        # Cleanup: End any stoops created during tests
        if self.stoop_id:
            try:
                self.session.post(f"{BASE_URL}/api/stoop/{self.stoop_id}/end")
            except:
                pass
    
    def _login(self):
        """Helper to login and get session"""
        # First try to login
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if response.status_code == 401:
            # User doesn't exist, create it
            signup_response = self.session.post(f"{BASE_URL}/api/auth/signup", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "name": "Stoop Test User"
            })
            assert signup_response.status_code in [200, 201], f"Signup failed: {signup_response.text}"
            return True
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        return True
    
    # ==================
    # STOOP CRUD TESTS
    # ==================
    
    def test_get_live_stoops_unauthenticated(self):
        """Test GET /api/stoop/live - should work without auth"""
        response = self.session.get(f"{BASE_URL}/api/stoop/live")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list of stoops"
        print(f"✓ GET /api/stoop/live returns {len(data)} live stoops")
    
    def test_create_stoop_requires_auth(self):
        """Test POST /api/stoop/create requires authentication"""
        response = self.session.post(f"{BASE_URL}/api/stoop/create", json={
            "title": "Test Stoop"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ POST /api/stoop/create requires authentication")
    
    def test_create_stoop_authenticated(self):
        """Test creating a new Stoop"""
        self._login()
        
        response = self.session.post(f"{BASE_URL}/api/stoop/create", json={
            "title": "LiveKit Test Stoop"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "stoop_id" in data, "Response should contain stoop_id"
        assert data["title"] == "LiveKit Test Stoop", "Title should match"
        assert data["is_live"] == True, "Stoop should be live"
        assert "host_id" in data, "Response should contain host_id"
        assert "speakers" in data, "Response should contain speakers list"
        
        self.stoop_id = data["stoop_id"]
        print(f"✓ Created stoop: {self.stoop_id}")
        
        # Cleanup
        self.session.post(f"{BASE_URL}/api/stoop/{self.stoop_id}/end")
    
    def test_get_stoop_by_id(self):
        """Test GET /api/stoop/{stoop_id}"""
        self._login()
        
        # Create a stoop first
        create_response = self.session.post(f"{BASE_URL}/api/stoop/create", json={
            "title": "Get Stoop Test"
        })
        assert create_response.status_code == 200
        stoop_id = create_response.json()["stoop_id"]
        self.stoop_id = stoop_id
        
        # Get the stoop
        response = self.session.get(f"{BASE_URL}/api/stoop/{stoop_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["stoop_id"] == stoop_id
        assert data["title"] == "Get Stoop Test"
        assert "host" in data, "Should include host details"
        assert "speaker_details" in data, "Should include speaker details"
        print(f"✓ GET /api/stoop/{stoop_id} returns correct data")
        
        # Cleanup
        self.session.post(f"{BASE_URL}/api/stoop/{stoop_id}/end")
    
    def test_get_nonexistent_stoop(self):
        """Test GET /api/stoop/{invalid_id} returns 404"""
        response = self.session.get(f"{BASE_URL}/api/stoop/nonexistent_stoop_id")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ GET /api/stoop/nonexistent returns 404")
    
    # ==================
    # JOIN/LEAVE TESTS
    # ==================
    
    def test_join_stoop(self):
        """Test POST /api/stoop/{stoop_id}/join"""
        self._login()
        
        # Create a stoop
        create_response = self.session.post(f"{BASE_URL}/api/stoop/create", json={
            "title": "Join Test Stoop"
        })
        stoop_id = create_response.json()["stoop_id"]
        self.stoop_id = stoop_id
        
        # Join the stoop
        response = self.session.post(f"{BASE_URL}/api/stoop/{stoop_id}/join")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "message" in data
        print(f"✓ POST /api/stoop/{stoop_id}/join works")
        
        # Cleanup
        self.session.post(f"{BASE_URL}/api/stoop/{stoop_id}/end")
    
    def test_leave_stoop(self):
        """Test POST /api/stoop/{stoop_id}/leave"""
        self._login()
        
        # Create and join a stoop
        create_response = self.session.post(f"{BASE_URL}/api/stoop/create", json={
            "title": "Leave Test Stoop"
        })
        stoop_id = create_response.json()["stoop_id"]
        self.stoop_id = stoop_id
        
        self.session.post(f"{BASE_URL}/api/stoop/{stoop_id}/join")
        
        # Leave the stoop
        response = self.session.post(f"{BASE_URL}/api/stoop/{stoop_id}/leave")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "message" in data
        print(f"✓ POST /api/stoop/{stoop_id}/leave works")
        
        # Cleanup
        self.session.post(f"{BASE_URL}/api/stoop/{stoop_id}/end")
    
    def test_end_stoop(self):
        """Test POST /api/stoop/{stoop_id}/end - host only"""
        self._login()
        
        # Create a stoop
        create_response = self.session.post(f"{BASE_URL}/api/stoop/create", json={
            "title": "End Test Stoop"
        })
        stoop_id = create_response.json()["stoop_id"]
        
        # End the stoop
        response = self.session.post(f"{BASE_URL}/api/stoop/{stoop_id}/end")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "message" in data
        print(f"✓ POST /api/stoop/{stoop_id}/end works")
        
        # Verify stoop is no longer live
        get_response = self.session.get(f"{BASE_URL}/api/stoop/{stoop_id}")
        assert get_response.status_code == 200
        assert get_response.json()["is_live"] == False, "Stoop should not be live after ending"
        print("✓ Stoop is_live=False after ending")
    
    # ==================
    # LIVEKIT TOKEN TESTS
    # ==================
    
    def test_livekit_token_requires_auth(self):
        """Test GET /api/stoop/{stoop_id}/livekit-token requires authentication"""
        response = self.session.get(f"{BASE_URL}/api/stoop/some_stoop_id/livekit-token")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ GET /api/stoop/{id}/livekit-token requires authentication")
    
    def test_livekit_token_for_nonexistent_stoop(self):
        """Test LiveKit token for non-existent stoop returns 404"""
        self._login()
        
        response = self.session.get(f"{BASE_URL}/api/stoop/nonexistent_stoop/livekit-token")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ LiveKit token for non-existent stoop returns 404")
    
    def test_livekit_token_generation(self):
        """Test LiveKit token generation for valid stoop"""
        self._login()
        
        # Create a stoop
        create_response = self.session.post(f"{BASE_URL}/api/stoop/create", json={
            "title": "LiveKit Token Test"
        })
        assert create_response.status_code == 200
        stoop_id = create_response.json()["stoop_id"]
        self.stoop_id = stoop_id
        
        # Get LiveKit token
        response = self.session.get(f"{BASE_URL}/api/stoop/{stoop_id}/livekit-token")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify token response structure
        assert "token" in data, "Response should contain token"
        assert "url" in data, "Response should contain url"
        assert "room" in data, "Response should contain room"
        assert "is_speaker" in data, "Response should contain is_speaker"
        
        # Verify token is a JWT (starts with eyJ)
        assert data["token"].startswith("eyJ"), "Token should be a JWT"
        
        # Verify URL is the LiveKit URL
        assert "livekit.cloud" in data["url"], f"URL should be LiveKit cloud: {data['url']}"
        
        # Verify room matches stoop_id
        assert data["room"] == stoop_id, f"Room should match stoop_id: {data['room']}"
        
        # Host should be a speaker
        assert data["is_speaker"] == True, "Host should be a speaker"
        
        print(f"✓ LiveKit token generated successfully")
        print(f"  - Token: {data['token'][:50]}...")
        print(f"  - URL: {data['url']}")
        print(f"  - Room: {data['room']}")
        print(f"  - Is Speaker: {data['is_speaker']}")
        
        # Cleanup
        self.session.post(f"{BASE_URL}/api/stoop/{stoop_id}/end")
    
    def test_livekit_token_for_listener(self):
        """Test LiveKit token for a listener (non-speaker)"""
        # Login as first user and create stoop
        self._login()
        
        create_response = self.session.post(f"{BASE_URL}/api/stoop/create", json={
            "title": "Listener Token Test"
        })
        stoop_id = create_response.json()["stoop_id"]
        self.stoop_id = stoop_id
        
        # Create a second session for a different user
        session2 = requests.Session()
        session2.headers.update({"Content-Type": "application/json"})
        
        # Create/login second user
        listener_email = "stooplistener@blvx.app"
        listener_password = "testpass123"
        
        login_response = session2.post(f"{BASE_URL}/api/auth/login", json={
            "email": listener_email,
            "password": listener_password
        })
        
        if login_response.status_code == 401:
            signup_response = session2.post(f"{BASE_URL}/api/auth/signup", json={
                "email": listener_email,
                "password": listener_password,
                "name": "Stoop Listener"
            })
            assert signup_response.status_code in [200, 201]
        
        # Join the stoop as listener
        join_response = session2.post(f"{BASE_URL}/api/stoop/{stoop_id}/join")
        assert join_response.status_code == 200
        
        # Get LiveKit token as listener
        token_response = session2.get(f"{BASE_URL}/api/stoop/{stoop_id}/livekit-token")
        assert token_response.status_code == 200
        
        data = token_response.json()
        assert "token" in data
        assert "is_speaker" in data
        # Listener should NOT be a speaker
        assert data["is_speaker"] == False, "Listener should not be a speaker"
        
        print(f"✓ Listener gets token with is_speaker=False")
        
        # Cleanup
        self.session.post(f"{BASE_URL}/api/stoop/{stoop_id}/end")
    
    def test_livekit_token_for_ended_stoop(self):
        """Test LiveKit token for ended stoop returns 404"""
        self._login()
        
        # Create and end a stoop
        create_response = self.session.post(f"{BASE_URL}/api/stoop/create", json={
            "title": "Ended Stoop Token Test"
        })
        stoop_id = create_response.json()["stoop_id"]
        
        # End the stoop
        self.session.post(f"{BASE_URL}/api/stoop/{stoop_id}/end")
        
        # Try to get token for ended stoop
        response = self.session.get(f"{BASE_URL}/api/stoop/{stoop_id}/livekit-token")
        assert response.status_code == 404, f"Expected 404 for ended stoop, got {response.status_code}"
        print("✓ LiveKit token for ended stoop returns 404")
    
    # ==================
    # PASS AUX TESTS
    # ==================
    
    def test_pass_aux_requires_host(self):
        """Test POST /api/stoop/{stoop_id}/pass-aux requires host"""
        self._login()
        
        # Create stoop
        create_response = self.session.post(f"{BASE_URL}/api/stoop/create", json={
            "title": "Pass Aux Test"
        })
        stoop_id = create_response.json()["stoop_id"]
        self.stoop_id = stoop_id
        
        # Create second user session
        session2 = requests.Session()
        session2.headers.update({"Content-Type": "application/json"})
        
        non_host_email = "nonhost@blvx.app"
        login_response = session2.post(f"{BASE_URL}/api/auth/login", json={
            "email": non_host_email,
            "password": "testpass123"
        })
        
        if login_response.status_code == 401:
            session2.post(f"{BASE_URL}/api/auth/signup", json={
                "email": non_host_email,
                "password": "testpass123",
                "name": "Non Host User"
            })
        
        # Join as listener
        session2.post(f"{BASE_URL}/api/stoop/{stoop_id}/join")
        
        # Try to pass aux as non-host (should fail)
        response = session2.post(f"{BASE_URL}/api/stoop/{stoop_id}/pass-aux?user_id=some_user")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Pass aux requires host permission")
        
        # Cleanup
        self.session.post(f"{BASE_URL}/api/stoop/{stoop_id}/end")


class TestStoopIntegration:
    """Integration tests for Stoop workflow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.stoop_id = None
        yield
        if self.stoop_id:
            try:
                self.session.post(f"{BASE_URL}/api/stoop/{self.stoop_id}/end")
            except:
                pass
    
    def _login(self):
        """Helper to login"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 401:
            self.session.post(f"{BASE_URL}/api/auth/signup", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "name": "Stoop Test User"
            })
        return True
    
    def test_full_stoop_workflow(self):
        """Test complete stoop workflow: create -> join -> get token -> leave -> end"""
        self._login()
        
        # 1. Create stoop
        print("\n--- Full Stoop Workflow Test ---")
        create_response = self.session.post(f"{BASE_URL}/api/stoop/create", json={
            "title": "Full Workflow Test Stoop"
        })
        assert create_response.status_code == 200
        stoop_id = create_response.json()["stoop_id"]
        self.stoop_id = stoop_id
        print(f"1. Created stoop: {stoop_id}")
        
        # 2. Verify stoop appears in live list
        live_response = self.session.get(f"{BASE_URL}/api/stoop/live")
        assert live_response.status_code == 200
        live_stoops = live_response.json()
        stoop_ids = [s["stoop_id"] for s in live_stoops]
        assert stoop_id in stoop_ids, "Created stoop should appear in live list"
        print("2. Stoop appears in live list")
        
        # 3. Get stoop details
        details_response = self.session.get(f"{BASE_URL}/api/stoop/{stoop_id}")
        assert details_response.status_code == 200
        details = details_response.json()
        assert details["is_live"] == True
        print("3. Got stoop details, is_live=True")
        
        # 4. Get LiveKit token
        token_response = self.session.get(f"{BASE_URL}/api/stoop/{stoop_id}/livekit-token")
        assert token_response.status_code == 200
        token_data = token_response.json()
        assert "token" in token_data
        assert token_data["is_speaker"] == True
        print(f"4. Got LiveKit token (is_speaker={token_data['is_speaker']})")
        
        # 5. Leave stoop
        leave_response = self.session.post(f"{BASE_URL}/api/stoop/{stoop_id}/leave")
        assert leave_response.status_code == 200
        print("5. Left stoop")
        
        # 6. End stoop
        end_response = self.session.post(f"{BASE_URL}/api/stoop/{stoop_id}/end")
        assert end_response.status_code == 200
        print("6. Ended stoop")
        
        # 7. Verify stoop is no longer live
        final_details = self.session.get(f"{BASE_URL}/api/stoop/{stoop_id}")
        assert final_details.status_code == 200
        assert final_details.json()["is_live"] == False
        print("7. Verified stoop is_live=False")
        
        # 8. Verify stoop no longer in live list
        final_live = self.session.get(f"{BASE_URL}/api/stoop/live")
        final_stoop_ids = [s["stoop_id"] for s in final_live.json()]
        assert stoop_id not in final_stoop_ids, "Ended stoop should not appear in live list"
        print("8. Stoop removed from live list")
        
        print("✓ Full workflow completed successfully!")
        self.stoop_id = None  # Already ended


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
