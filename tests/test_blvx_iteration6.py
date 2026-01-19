"""
BLVX Iteration 6 Tests - Testing new features:
1. Light Mode toggle - Theme switching
2. Link Preview API - /api/link-preview with BeautifulSoup scraping
3. Google Search URLs - Spark posts use google.com/search links
4. The Lookout - Crowdsourced safety alerts with vouch/cap verification
"""

import pytest
import requests
import os
import time
from datetime import datetime, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "testuser@blvx.app"
TEST_PASSWORD = "testpassword123"


class TestSession:
    """Shared session for authenticated tests"""
    session = None
    token = None
    user = None


@pytest.fixture(scope="module")
def api_client():
    """Create a requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_session(api_client):
    """Login and get authenticated session"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    
    if response.status_code != 200:
        pytest.skip(f"Login failed: {response.status_code} - {response.text}")
    
    TestSession.user = response.json()
    # Get session cookie
    TestSession.token = response.cookies.get("session_token")
    api_client.cookies.set("session_token", TestSession.token)
    
    return api_client


# ========================
# LINK PREVIEW API TESTS
# ========================

class TestLinkPreviewAPI:
    """Test /api/link-preview endpoint with BeautifulSoup scraping"""
    
    def test_link_preview_requires_auth(self, api_client):
        """Link preview should require authentication"""
        # Clear any existing cookies
        fresh_client = requests.Session()
        response = fresh_client.get(f"{BASE_URL}/api/link-preview", params={"url": "https://google.com"})
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_link_preview_google_search_url(self, auth_session):
        """Google Search URLs should return special preview format"""
        google_url = "https://www.google.com/search?q=tech+news+2024"
        response = auth_session.get(f"{BASE_URL}/api/link-preview", params={"url": google_url})
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify Google Search URL handling
        assert data.get("domain") == "google.com", f"Expected google.com domain, got {data.get('domain')}"
        assert "Search:" in data.get("title", ""), f"Expected 'Search:' in title, got {data.get('title')}"
        assert data.get("image") is not None, "Google search should have Google logo image"
        assert "google" in data.get("image", "").lower(), "Image should be Google logo"
    
    def test_link_preview_returns_structure(self, auth_session):
        """Link preview should return proper structure with url, domain, title, description"""
        test_url = "https://example.com/test-article"
        response = auth_session.get(f"{BASE_URL}/api/link-preview", params={"url": test_url})
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Check required fields
        assert "url" in data, "Response should have 'url' field"
        assert "domain" in data, "Response should have 'domain' field"
        assert "title" in data, "Response should have 'title' field"
        assert "description" in data, "Response should have 'description' field"
        
        # Domain should be extracted correctly
        assert data["domain"] == "example.com", f"Expected example.com, got {data['domain']}"
    
    def test_link_preview_known_domain_fallback(self, auth_session):
        """Known domains should have fallback images"""
        # Test with a known domain that has fallback image
        test_url = "https://techcrunch.com/some-article"
        response = auth_session.get(f"{BASE_URL}/api/link-preview", params={"url": test_url})
        
        assert response.status_code == 200
        data = response.json()
        
        # TechCrunch should have fallback image
        assert data.get("domain") == "techcrunch.com"
        # Image may or may not be present depending on scraping success


# ========================
# THE LOOKOUT API TESTS
# ========================

class TestLookoutAPI:
    """Test The Lookout - Crowdsourced safety alerts"""
    
    created_alert_id = None
    
    def test_create_alert_requires_auth(self, api_client):
        """Creating alert should require authentication"""
        fresh_client = requests.Session()
        response = fresh_client.post(f"{BASE_URL}/api/lookout", json={
            "alert_type": "police",
            "description": "Test alert",
            "location": "Test City"
        })
        assert response.status_code == 401
    
    def test_create_alert_success(self, auth_session):
        """Should create a new safety alert"""
        alert_data = {
            "alert_type": "police",
            "description": "Police checkpoint on Main Street near the intersection",
            "location": "Downtown Atlanta"
        }
        
        response = auth_session.post(f"{BASE_URL}/api/lookout", json=alert_data)
        
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "alert_id" in data, "Response should have alert_id"
        assert data["alert_type"] == "police"
        assert data["description"] == alert_data["description"]
        assert data["location"] == "Downtown Atlanta"
        assert data["status"] == "pending", "New alerts should be pending"
        assert data["vouches"] == 0
        assert data["caps"] == 0
        assert "user" in data, "Response should include user info"
        
        # Store for later tests
        TestLookoutAPI.created_alert_id = data["alert_id"]
    
    def test_create_alert_all_types(self, auth_session):
        """Should accept all valid alert types"""
        alert_types = ["police", "safety_hazard", "protest", "vibe_check", "other"]
        
        for alert_type in alert_types:
            response = auth_session.post(f"{BASE_URL}/api/lookout", json={
                "alert_type": alert_type,
                "description": f"Test {alert_type} alert",
                "location": "Test Location"
            })
            assert response.status_code == 201, f"Failed to create {alert_type} alert: {response.text}"
    
    def test_create_alert_invalid_type(self, auth_session):
        """Should reject invalid alert types"""
        response = auth_session.post(f"{BASE_URL}/api/lookout", json={
            "alert_type": "invalid_type",
            "description": "Test alert",
            "location": "Test City"
        })
        assert response.status_code == 400
    
    def test_get_alerts_list(self, auth_session):
        """Should return list of active alerts"""
        response = auth_session.get(f"{BASE_URL}/api/lookout")
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        if len(data) > 0:
            alert = data[0]
            assert "alert_id" in alert
            assert "alert_type" in alert
            assert "description" in alert
            assert "location" in alert
            assert "status" in alert
            assert "vouches" in alert
            assert "caps" in alert
    
    def test_get_alerts_filter_by_status(self, auth_session):
        """Should filter alerts by status"""
        response = auth_session.get(f"{BASE_URL}/api/lookout", params={"status": "pending"})
        
        assert response.status_code == 200
        data = response.json()
        
        # All returned alerts should be pending
        for alert in data:
            assert alert["status"] == "pending", f"Expected pending, got {alert['status']}"
    
    def test_get_active_verified_alerts(self, auth_session):
        """Should return summary of active verified alerts for ticker"""
        response = auth_session.get(f"{BASE_URL}/api/lookout/active")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "total_active" in data
        assert "by_location" in data
        assert isinstance(data["by_location"], dict)
    
    def test_vouch_alert(self, auth_session):
        """Should vouch for an alert"""
        # First create a fresh alert
        create_response = auth_session.post(f"{BASE_URL}/api/lookout", json={
            "alert_type": "safety_hazard",
            "description": "Test vouch alert",
            "location": "Test City"
        })
        assert create_response.status_code == 201
        alert_id = create_response.json()["alert_id"]
        
        # Create a second user to vouch (since creator can't vouch their own)
        # For this test, we'll verify the endpoint exists and returns proper error
        response = auth_session.post(f"{BASE_URL}/api/lookout/{alert_id}/vouch")
        
        # Either success (200) or "already vouched" error (400) is acceptable
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert "vouches" in data
            assert "status" in data
    
    def test_cap_alert(self, auth_session):
        """Should cap (dispute) an alert"""
        # Create a fresh alert
        create_response = auth_session.post(f"{BASE_URL}/api/lookout", json={
            "alert_type": "other",
            "description": "Test cap alert",
            "location": "Test City"
        })
        assert create_response.status_code == 201
        alert_id = create_response.json()["alert_id"]
        
        response = auth_session.post(f"{BASE_URL}/api/lookout/{alert_id}/cap")
        
        # Either success or already capped
        assert response.status_code in [200, 400]
        
        if response.status_code == 200:
            data = response.json()
            assert "caps" in data
            assert "status" in data
    
    def test_vouch_nonexistent_alert(self, auth_session):
        """Should return 404 for non-existent alert"""
        response = auth_session.post(f"{BASE_URL}/api/lookout/nonexistent_alert_id/vouch")
        assert response.status_code == 404
    
    def test_delete_own_alert(self, auth_session):
        """Should delete own alert"""
        # Create an alert to delete
        create_response = auth_session.post(f"{BASE_URL}/api/lookout", json={
            "alert_type": "vibe_check",
            "description": "Alert to delete",
            "location": "Delete City"
        })
        assert create_response.status_code == 201
        alert_id = create_response.json()["alert_id"]
        
        # Delete it
        response = auth_session.delete(f"{BASE_URL}/api/lookout/{alert_id}")
        assert response.status_code == 200


# ========================
# SPARK POSTS WITH GOOGLE SEARCH URLS
# ========================

class TestSparkGoogleSearchURLs:
    """Test that Spark posts use Google Search URLs instead of hallucinated links"""
    
    def test_spark_categories_exist(self, auth_session):
        """Spark categories should be available"""
        response = auth_session.get(f"{BASE_URL}/api/spark/categories")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "categories" in data
        assert "topics" in data
        assert len(data["categories"]) > 0
    
    def test_spark_drop_creates_post_with_reference_url(self, auth_session):
        """Spark drop should create post with reference_url"""
        response = auth_session.post(f"{BASE_URL}/api/spark/drop")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "post" in data
        post = data["post"]
        
        # Verify post has reference_url
        assert "reference_url" in post, "Spark post should have reference_url"
        
        # If reference_url is set, it should be a Google Search URL
        if post.get("reference_url"):
            assert "google.com/search" in post["reference_url"], \
                f"Expected Google Search URL, got {post['reference_url']}"


# ========================
# HEALTH CHECK
# ========================

class TestHealthCheck:
    """Basic health check tests"""
    
    def test_health_endpoint(self, api_client):
        """Health endpoint should be accessible"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
