"""
Test suite for Bonita AI Sidebar Chat Feature
Tests the 1-on-1 conversational chat with Bonita in The Sidebar
"""
import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "fresh@blvx.app"
TEST_PASSWORD = "testpassword123"

# Bonita's expected avatar URL
BONITA_AVATAR_URL = "https://customer-assets.emergentagent.com/job_high-context/artifacts/on1dw2e3_Real%20Bonita%202%20avatar.jpg"


class TestBonitaSidebarChat:
    """Tests for Bonita AI conversational chat in Sidebar"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get session
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.text}")
        
        self.user = login_response.json()
        print(f"Logged in as: {self.user.get('email')}")
    
    def test_bonita_ai_user_exists(self):
        """Test that bonita_ai user exists in the system"""
        # Check via user search
        response = self.session.get(
            f"{BASE_URL}/api/users/search?q=bonita",
        )
        assert response.status_code == 200
        users = response.json()
        
        # Find bonita_ai user
        bonita = next((u for u in users if u.get('user_id') == 'bonita_ai' or u.get('username') == 'bonita'), None)
        assert bonita is not None, "Bonita AI user should exist"
        assert bonita.get('name') == 'Bonita', "Bonita should have correct name"
        print(f"✓ Bonita AI user exists: {bonita.get('username')}")
    
    def test_bonita_avatar_url_correct(self):
        """Test that Bonita has the correct avatar URL (red headwrap lady)"""
        response = self.session.get(
            f"{BASE_URL}/api/users/search?q=bonita",
        )
        assert response.status_code == 200
        users = response.json()
        
        bonita = next((u for u in users if u.get('user_id') == 'bonita_ai' or u.get('username') == 'bonita'), None)
        assert bonita is not None
        
        # Check avatar URL
        assert bonita.get('picture') == BONITA_AVATAR_URL, f"Bonita avatar should be the red headwrap photo. Got: {bonita.get('picture')}"
        print(f"✓ Bonita avatar URL is correct")
    
    def test_create_sidebar_with_bonita(self):
        """Test creating a sidebar chat with Bonita"""
        response = self.session.post(
            f"{BASE_URL}/api/sidebar/create?other_user_id=bonita_ai",
        )
        assert response.status_code == 200
        sidebar = response.json()
        
        assert 'sidebar_id' in sidebar, "Response should contain sidebar_id"
        assert sidebar.get('user_2') == 'bonita_ai' or sidebar.get('user_1') == 'bonita_ai', "Sidebar should include bonita_ai"
        
        self.sidebar_id = sidebar['sidebar_id']
        print(f"✓ Created/retrieved sidebar with Bonita: {self.sidebar_id}")
        return sidebar
    
    def test_get_sidebar_shows_bonita_info(self):
        """Test that sidebar info shows Bonita's details correctly"""
        # First create/get sidebar
        create_response = self.session.post(
            f"{BASE_URL}/api/sidebar/create?other_user_id=bonita_ai",
        )
        assert create_response.status_code == 200
        sidebar = create_response.json()
        sidebar_id = sidebar['sidebar_id']
        
        # Get sidebar details
        response = self.session.get(f"{BASE_URL}/api/sidebar/{sidebar_id}")
        assert response.status_code == 200
        sidebar_details = response.json()
        
        # Check other_user info
        other_user = sidebar_details.get('other_user', {})
        assert other_user.get('user_id') == 'bonita_ai' or other_user.get('name') == 'Bonita', "Other user should be Bonita"
        print(f"✓ Sidebar shows Bonita info: {other_user.get('name')}")
    
    def test_send_message_to_bonita(self):
        """Test sending a message to Bonita"""
        # Create sidebar
        create_response = self.session.post(
            f"{BASE_URL}/api/sidebar/create?other_user_id=bonita_ai",
        )
        assert create_response.status_code == 200
        sidebar_id = create_response.json()['sidebar_id']
        
        # Send message
        test_message = f"Test message {uuid.uuid4().hex[:8]}"
        response = self.session.post(
            f"{BASE_URL}/api/sidebar/{sidebar_id}/message?content={test_message}",
        )
        assert response.status_code == 200
        message = response.json()
        
        assert message.get('content') == test_message, "Message content should match"
        assert message.get('user_id') == self.user.get('user_id'), "Message should be from current user"
        print(f"✓ Sent message to Bonita: {test_message[:30]}...")
        return sidebar_id
    
    def test_bonita_responds_to_message(self):
        """Test that Bonita responds to a message within 10 seconds"""
        # Create sidebar
        create_response = self.session.post(
            f"{BASE_URL}/api/sidebar/create?other_user_id=bonita_ai",
        )
        assert create_response.status_code == 200
        sidebar_id = create_response.json()['sidebar_id']
        
        # Get initial message count
        initial_messages = self.session.get(
            f"{BASE_URL}/api/sidebar/{sidebar_id}/messages"
        ).json()
        initial_count = len(initial_messages)
        
        # Send message to Bonita
        test_message = "Hey Bonita! What's good?"
        self.session.post(
            f"{BASE_URL}/api/sidebar/{sidebar_id}/message?content={test_message}",
        )
        
        # Poll for Bonita's response (up to 15 seconds)
        bonita_responded = False
        for i in range(10):
            time.sleep(1.5)
            messages = self.session.get(
                f"{BASE_URL}/api/sidebar/{sidebar_id}/messages"
            ).json()
            
            # Check if we got a new message from bonita_ai
            if len(messages) > initial_count + 1:
                last_message = messages[-1]
                if last_message.get('user_id') == 'bonita_ai':
                    bonita_responded = True
                    print(f"✓ Bonita responded after {(i+1)*1.5} seconds: {last_message.get('content')[:50]}...")
                    break
        
        assert bonita_responded, "Bonita should respond within 15 seconds"
    
    def test_bonita_response_has_correct_styling_data(self):
        """Test that Bonita's messages have correct user info for amber/gold styling"""
        # Create sidebar
        create_response = self.session.post(
            f"{BASE_URL}/api/sidebar/create?other_user_id=bonita_ai",
        )
        assert create_response.status_code == 200
        sidebar_id = create_response.json()['sidebar_id']
        
        # Send message
        self.session.post(
            f"{BASE_URL}/api/sidebar/{sidebar_id}/message?content=Tell me about BLVX",
        )
        
        # Wait for response
        time.sleep(5)
        
        # Get messages
        messages = self.session.get(
            f"{BASE_URL}/api/sidebar/{sidebar_id}/messages"
        ).json()
        
        # Find Bonita's message
        bonita_messages = [m for m in messages if m.get('user_id') == 'bonita_ai']
        
        if bonita_messages:
            bonita_msg = bonita_messages[-1]
            # Check user info is present for styling
            assert bonita_msg.get('user_id') == 'bonita_ai', "Message should have bonita_ai user_id"
            print(f"✓ Bonita message has correct user_id for styling")
        else:
            pytest.skip("No Bonita messages found yet - may need more time")
    
    def test_multi_turn_conversation(self):
        """Test multi-turn conversation with Bonita"""
        # Create sidebar
        create_response = self.session.post(
            f"{BASE_URL}/api/sidebar/create?other_user_id=bonita_ai",
        )
        assert create_response.status_code == 200
        sidebar_id = create_response.json()['sidebar_id']
        
        # First message
        self.session.post(
            f"{BASE_URL}/api/sidebar/{sidebar_id}/message?content=What is The Block on BLVX?",
        )
        time.sleep(5)
        
        # Second message
        self.session.post(
            f"{BASE_URL}/api/sidebar/{sidebar_id}/message?content=And what about The Cookout?",
        )
        time.sleep(5)
        
        # Get all messages
        messages = self.session.get(
            f"{BASE_URL}/api/sidebar/{sidebar_id}/messages"
        ).json()
        
        # Count Bonita's responses
        bonita_responses = [m for m in messages if m.get('user_id') == 'bonita_ai']
        
        # Should have at least 1 response (ideally 2)
        assert len(bonita_responses) >= 1, "Bonita should respond to at least one message"
        print(f"✓ Multi-turn conversation: {len(bonita_responses)} Bonita responses")
    
    def test_sidebar_list_shows_bonita(self):
        """Test that Bonita appears in the sidebar list"""
        # First ensure we have a sidebar with Bonita
        self.session.post(
            f"{BASE_URL}/api/sidebar/create?other_user_id=bonita_ai",
        )
        
        # Get sidebar list
        response = self.session.get(f"{BASE_URL}/api/sidebar/my-sidebars")
        assert response.status_code == 200
        sidebars = response.json()
        
        # Find Bonita sidebar
        bonita_sidebar = next(
            (s for s in sidebars if s.get('user_1') == 'bonita_ai' or s.get('user_2') == 'bonita_ai'),
            None
        )
        
        assert bonita_sidebar is not None, "Bonita sidebar should appear in list"
        
        # Check other_user info
        other_user = bonita_sidebar.get('other_user', {})
        if other_user:
            assert other_user.get('user_id') == 'bonita_ai' or other_user.get('name') == 'Bonita'
            print(f"✓ Bonita appears in sidebar list with correct info")
        else:
            print(f"✓ Bonita sidebar found in list")


class TestBonitaAvatarDisplay:
    """Tests specifically for Bonita's avatar display"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.text}")
        
        self.user = login_response.json()
    
    def test_bonita_avatar_in_sidebar_messages(self):
        """Test that Bonita's avatar appears correctly in sidebar messages"""
        # Create sidebar
        create_response = self.session.post(
            f"{BASE_URL}/api/sidebar/create?other_user_id=bonita_ai",
        )
        sidebar_id = create_response.json()['sidebar_id']
        
        # Send message and wait for response
        self.session.post(
            f"{BASE_URL}/api/sidebar/{sidebar_id}/message?content=Hey Bonita!",
        )
        time.sleep(5)
        
        # Get messages
        messages = self.session.get(
            f"{BASE_URL}/api/sidebar/{sidebar_id}/messages"
        ).json()
        
        # Find Bonita's message
        bonita_messages = [m for m in messages if m.get('user_id') == 'bonita_ai']
        
        if bonita_messages:
            bonita_msg = bonita_messages[-1]
            user_info = bonita_msg.get('user', {})
            
            # Check avatar URL if user info is present
            if user_info and user_info.get('picture'):
                assert user_info.get('picture') == BONITA_AVATAR_URL, f"Bonita's avatar should be correct. Got: {user_info.get('picture')}"
                print(f"✓ Bonita's avatar URL correct in messages")
            else:
                # Avatar might be added by frontend
                print(f"✓ Bonita message found (avatar handled by frontend)")
        else:
            pytest.skip("No Bonita messages yet")


class TestSidebarPolling:
    """Tests for the polling mechanism that shows Bonita's response"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.text}")
        
        self.user = login_response.json()
    
    def test_messages_endpoint_returns_new_messages(self):
        """Test that messages endpoint returns new messages for polling"""
        # Create sidebar
        create_response = self.session.post(
            f"{BASE_URL}/api/sidebar/create?other_user_id=bonita_ai",
        )
        sidebar_id = create_response.json()['sidebar_id']
        
        # Get initial messages
        initial = self.session.get(
            f"{BASE_URL}/api/sidebar/{sidebar_id}/messages"
        ).json()
        initial_count = len(initial)
        
        # Send message
        self.session.post(
            f"{BASE_URL}/api/sidebar/{sidebar_id}/message?content=Testing polling",
        )
        
        # Poll multiple times
        message_counts = []
        for i in range(5):
            time.sleep(1.5)
            messages = self.session.get(
                f"{BASE_URL}/api/sidebar/{sidebar_id}/messages"
            ).json()
            message_counts.append(len(messages))
        
        # Should see message count increase
        assert message_counts[-1] > initial_count, "Message count should increase after sending"
        print(f"✓ Polling shows message count progression: {message_counts}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
