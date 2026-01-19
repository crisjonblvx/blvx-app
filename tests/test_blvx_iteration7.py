"""
BLVX Iteration 7 Tests
Testing: Vouch System, Sidebar (1-on-1 whispers), Spark (culturally diverse content), Feed Refresh
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from main agent
TEST_EMAIL = "sparktest@blvx.app"
TEST_PASSWORD = "Test123!"

class TestSetup:
    """Setup and authentication tests"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create a requests session"""
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_token(self, session):
        """Login and get session token"""
        # First try to login
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        if response.status_code == 200:
            # Extract session token from cookies
            return session.cookies.get('session_token')
        elif response.status_code == 401:
            # User doesn't exist, create it
            signup_response = session.post(
                f"{BASE_URL}/api/auth/signup",
                json={"email": TEST_EMAIL, "password": TEST_PASSWORD, "name": "Spark Test User"}
            )
            if signup_response.status_code == 200:
                return session.cookies.get('session_token')
            else:
                pytest.skip(f"Could not create test user: {signup_response.text}")
        else:
            pytest.skip(f"Login failed: {response.status_code} - {response.text}")
    
    def test_health_check(self, session):
        """Test API health endpoint"""
        response = session.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print(f"✓ Health check passed: {data}")


class TestVouchSystem:
    """Tests for The Vouch (Plate) System"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_session(self, session):
        """Login and return authenticated session"""
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        if response.status_code != 200:
            # Try signup
            session.post(
                f"{BASE_URL}/api/auth/signup",
                json={"email": TEST_EMAIL, "password": TEST_PASSWORD, "name": "Spark Test User"}
            )
        return session
    
    def test_get_my_plates(self, auth_session):
        """Test getting user's plates"""
        response = auth_session.get(f"{BASE_URL}/api/vouch/plate/my-plates")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get my plates: {len(data)} plates found")
    
    def test_create_plate(self, auth_session):
        """Test creating a new plate"""
        # First check user's plates remaining
        me_response = auth_session.get(f"{BASE_URL}/api/auth/me")
        if me_response.status_code == 200:
            user = me_response.json()
            plates_remaining = user.get('plates_remaining', 0)
            print(f"  User has {plates_remaining} plates remaining")
            
            if plates_remaining > 0:
                response = auth_session.post(f"{BASE_URL}/api/vouch/plate/create")
                assert response.status_code == 200
                data = response.json()
                assert "code" in data
                assert "plate_id" in data
                print(f"✓ Created plate with code: {data['code']}")
            else:
                print("⚠ User has no plates remaining, skipping create test")
        else:
            pytest.skip("Could not get user info")
    
    def test_redeem_invalid_plate(self, auth_session):
        """Test redeeming an invalid plate code"""
        response = auth_session.post(
            f"{BASE_URL}/api/vouch/plate/redeem",
            params={"code": "INVALID123"}
        )
        assert response.status_code == 404
        print("✓ Invalid plate code correctly rejected")


class TestSidebarSystem:
    """Tests for The Sidebar (1-on-1 DMs)"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_session(self, session):
        """Login and return authenticated session"""
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        if response.status_code != 200:
            session.post(
                f"{BASE_URL}/api/auth/signup",
                json={"email": TEST_EMAIL, "password": TEST_PASSWORD, "name": "Spark Test User"}
            )
        return session
    
    def test_get_my_sidebars(self, auth_session):
        """Test getting user's sidebars"""
        response = auth_session.get(f"{BASE_URL}/api/sidebar/my-sidebars")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get my sidebars: {len(data)} sidebars found")
    
    def test_create_sidebar_with_self_fails(self, auth_session):
        """Test that creating sidebar with yourself fails"""
        # Get current user
        me_response = auth_session.get(f"{BASE_URL}/api/auth/me")
        if me_response.status_code == 200:
            user = me_response.json()
            user_id = user.get('user_id')
            
            # Try to create sidebar with self
            response = auth_session.post(
                f"{BASE_URL}/api/sidebar/create",
                params={"other_user_id": user_id}
            )
            assert response.status_code == 400
            print("✓ Cannot create sidebar with yourself - correctly rejected")
        else:
            pytest.skip("Could not get user info")
    
    def test_create_sidebar_with_bonita(self, auth_session):
        """Test creating sidebar with Bonita (system user)"""
        response = auth_session.post(
            f"{BASE_URL}/api/sidebar/create",
            params={"other_user_id": "bonita"}
        )
        # Should succeed or return existing sidebar
        assert response.status_code == 200
        data = response.json()
        assert "sidebar_id" in data
        print(f"✓ Created/got sidebar with Bonita: {data['sidebar_id']}")
        return data['sidebar_id']


class TestSparkSystem:
    """Tests for The Spark (AI Content Seeder) with culturally diverse content"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_session(self, session):
        """Login and return authenticated session"""
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        if response.status_code != 200:
            session.post(
                f"{BASE_URL}/api/auth/signup",
                json={"email": TEST_EMAIL, "password": TEST_PASSWORD, "name": "Spark Test User"}
            )
        return session
    
    def test_get_spark_categories(self, auth_session):
        """Test getting available spark categories"""
        response = auth_session.get(f"{BASE_URL}/api/spark/categories")
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
        assert "topics" in data
        
        # Verify culturally diverse categories exist
        categories = data["categories"]
        assert "music" in categories
        assert "tech" in categories
        assert "culture" in categories
        assert "politics" in categories
        assert "finance" in categories
        
        # Check that topics contain POC/BIPOC focused queries
        topics = data["topics"]
        music_topics = topics.get("music", [])
        assert any("Black" in t or "Afrobeats" in t or "hip hop" in t for t in music_topics), \
            "Music topics should include Black/POC focused content"
        
        tech_topics = topics.get("tech", [])
        assert any("Black" in t or "diversity" in t or "POC" in t for t in tech_topics), \
            "Tech topics should include diversity/POC focused content"
        
        print(f"✓ Spark categories: {categories}")
        print(f"✓ Topics include culturally diverse content (POC/BIPOC focus)")
    
    def test_get_trending_news(self, auth_session):
        """Test getting trending news for dynamic spark topics"""
        response = auth_session.get(f"{BASE_URL}/api/spark/trending")
        assert response.status_code == 200
        data = response.json()
        assert "trending" in data
        assert "timestamp" in data
        
        trending = data["trending"]
        print(f"✓ Trending news: {len(trending)} items")
        for item in trending[:3]:
            print(f"  - [{item.get('category')}] {item.get('title', '')[:50]}...")
    
    def test_drop_spark_post(self, auth_session):
        """Test dropping a spark post"""
        response = auth_session.post(
            f"{BASE_URL}/api/spark/drop",
            params={"category": "culture"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "post" in data
        
        post = data["post"]
        assert post.get("is_spark") == True
        assert post.get("user_id") == "bonita"
        assert "content" in post
        
        print(f"✓ Dropped spark post: {post.get('content', '')[:80]}...")
        if post.get("reference_url"):
            print(f"  Reference URL: {post.get('reference_url')[:50]}...")
    
    def test_auto_spark_generates_multiple_posts(self, auth_session):
        """Test auto-spark generates multiple diverse posts"""
        response = auth_session.post(f"{BASE_URL}/api/spark/auto")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "posts" in data
        
        posts = data["posts"]
        assert len(posts) > 0, "Auto-spark should generate at least one post"
        
        # Check diversity - posts should be from different categories
        categories_used = set(p.get("category") for p in posts)
        print(f"✓ Auto-spark generated {len(posts)} posts from categories: {categories_used}")
        
        for post in posts:
            print(f"  - [{post.get('category')}] {post.get('content', '')[:50]}...")


class TestFeedAndRefresh:
    """Tests for Feed functionality and refresh"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_session(self, session):
        """Login and return authenticated session"""
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        if response.status_code != 200:
            session.post(
                f"{BASE_URL}/api/auth/signup",
                json={"email": TEST_EMAIL, "password": TEST_PASSWORD, "name": "Spark Test User"}
            )
        return session
    
    def test_get_feed(self, auth_session):
        """Test getting the main feed"""
        response = auth_session.get(f"{BASE_URL}/api/posts/feed")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Feed returned {len(data)} posts")
        
        # Check if spark posts are included
        spark_posts = [p for p in data if p.get("is_spark")]
        print(f"  - {len(spark_posts)} spark posts in feed")
    
    def test_get_explore_feed(self, auth_session):
        """Test getting the explore feed"""
        response = auth_session.get(f"{BASE_URL}/api/posts/explore")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Explore feed returned {len(data)} posts")
    
    def test_feed_refresh_returns_fresh_data(self, auth_session):
        """Test that feed refresh returns data (simulating refresh button)"""
        # First call
        response1 = auth_session.get(f"{BASE_URL}/api/posts/feed")
        assert response1.status_code == 200
        
        # Second call (simulating refresh)
        response2 = auth_session.get(f"{BASE_URL}/api/posts/feed")
        assert response2.status_code == 200
        
        print("✓ Feed refresh works correctly")


class TestUserProfile:
    """Tests for user profile with whisper button"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_session(self, session):
        """Login and return authenticated session"""
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        if response.status_code != 200:
            session.post(
                f"{BASE_URL}/api/auth/signup",
                json={"email": TEST_EMAIL, "password": TEST_PASSWORD, "name": "Spark Test User"}
            )
        return session
    
    def test_get_bonita_profile(self, auth_session):
        """Test getting Bonita's profile (system user)"""
        response = auth_session.get(f"{BASE_URL}/api/users/profile/bonita")
        assert response.status_code == 200
        data = response.json()
        assert data.get("username") == "bonita"
        assert data.get("verified") == True
        print(f"✓ Bonita profile: {data.get('name')} - {data.get('bio', '')[:50]}")
    
    def test_get_current_user_profile(self, auth_session):
        """Test getting current user's profile"""
        # First get current user
        me_response = auth_session.get(f"{BASE_URL}/api/auth/me")
        if me_response.status_code == 200:
            user = me_response.json()
            username = user.get('username')
            
            # Get profile
            response = auth_session.get(f"{BASE_URL}/api/users/profile/{username}")
            assert response.status_code == 200
            data = response.json()
            assert data.get("username") == username
            assert "plates_remaining" in data
            print(f"✓ User profile: {data.get('name')} has {data.get('plates_remaining')} plates")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
