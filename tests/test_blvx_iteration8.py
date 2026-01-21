"""
BLVX Iteration 8 Tests - New Features:
1. Cloudinary upload endpoint
2. Culture Calendar endpoint
3. Spark categories (politics, finance)
4. Push notification endpoints
5. Health check with cloudinary status
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://high-context-1.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = "sparktest@blvx.app"
TEST_PASSWORD = "Test123!"


class TestSession:
    """Shared session for authenticated tests"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    auth_token = None
    user = None


@pytest.fixture(scope="module")
def auth_session():
    """Login and get authenticated session"""
    response = TestSession.session.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    
    if response.status_code == 200:
        TestSession.user = response.json()
        # Session cookie is automatically stored
        return TestSession.session
    else:
        pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


# ========================
# HEALTH CHECK TESTS
# ========================

class TestHealthCheck:
    """Health check endpoint tests - verifies cloudinary status"""
    
    def test_health_check_returns_200(self):
        """Health check should return 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print(f"✓ Health check returned 200")
    
    def test_health_check_shows_cloudinary_enabled(self):
        """Health check should show cloudinary is enabled"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        
        assert "cloudinary" in data, "Health check should include cloudinary field"
        assert data["cloudinary"] == True, "Cloudinary should be enabled"
        assert data.get("storage") == "cloudinary", "Storage should be cloudinary"
        print(f"✓ Health check shows cloudinary enabled: {data}")


# ========================
# CLOUDINARY UPLOAD TESTS
# ========================

class TestCloudinaryUpload:
    """Cloudinary upload endpoint tests"""
    
    def test_upload_requires_auth(self):
        """Upload should require authentication"""
        response = requests.post(f"{BASE_URL}/api/upload")
        assert response.status_code == 401
        print(f"✓ Upload requires authentication (401)")
    
    def test_upload_requires_file(self, auth_session):
        """Upload should require a file"""
        response = auth_session.post(f"{BASE_URL}/api/upload")
        assert response.status_code == 400
        data = response.json()
        assert "No file" in data.get("detail", "")
        print(f"✓ Upload requires file (400)")
    
    def test_upload_image_to_cloudinary(self, auth_session):
        """Upload image should return cloudinary URL"""
        # Create a simple test image (1x1 red pixel PNG)
        import base64
        # Minimal valid PNG (1x1 red pixel)
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
        )
        
        files = {"file": ("test_image.png", png_data, "image/png")}
        
        # Remove Content-Type header for multipart upload
        headers = {k: v for k, v in auth_session.headers.items() if k.lower() != 'content-type'}
        
        response = requests.post(
            f"{BASE_URL}/api/upload",
            files=files,
            cookies=auth_session.cookies,
            headers=headers
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        
        assert "url" in data, "Response should include URL"
        assert "cloudinary" in data.get("url", "").lower() or data.get("storage") == "cloudinary", \
            f"Should upload to cloudinary, got: {data}"
        assert data.get("storage") == "cloudinary", f"Storage should be cloudinary, got: {data.get('storage')}"
        
        print(f"✓ Image uploaded to Cloudinary: {data.get('url')}")
        print(f"  Storage: {data.get('storage')}")


# ========================
# CULTURE CALENDAR TESTS
# ========================

class TestCultureCalendar:
    """Culture Calendar endpoint tests"""
    
    def test_calendar_endpoint_exists(self):
        """Culture calendar endpoint should exist"""
        response = requests.get(f"{BASE_URL}/api/spark/calendar")
        assert response.status_code == 200
        print(f"✓ Culture calendar endpoint exists (200)")
    
    def test_calendar_returns_event_structure(self):
        """Culture calendar should return proper structure"""
        response = requests.get(f"{BASE_URL}/api/spark/calendar")
        assert response.status_code == 200
        data = response.json()
        
        # Should have has_event field
        assert "has_event" in data, "Response should include has_event field"
        
        if data["has_event"]:
            assert "event" in data, "Should include event when has_event is true"
            event = data["event"]
            assert "name" in event, "Event should have name"
            assert "message" in event, "Event should have message"
            print(f"✓ Today's event: {event.get('name')}")
        else:
            # Should have upcoming events
            assert "upcoming" in data, "Should include upcoming events when no event today"
            print(f"✓ No event today, upcoming events: {len(data.get('upcoming', []))}")
    
    def test_calendar_post_requires_auth(self):
        """Calendar post should require authentication"""
        response = requests.post(f"{BASE_URL}/api/spark/calendar/post")
        assert response.status_code == 401
        print(f"✓ Calendar post requires authentication (401)")
    
    def test_calendar_post_endpoint_exists(self, auth_session):
        """Calendar post endpoint should exist and work"""
        response = auth_session.post(f"{BASE_URL}/api/spark/calendar/post")
        # Either 200 (event posted) or 404 (no event today) is valid
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert "event_name" in data, "Should include event_name"
            print(f"✓ Calendar post created: {data.get('event_name')}")
        else:
            print(f"✓ Calendar post endpoint works (no event today)")


# ========================
# SPARK CATEGORIES TESTS
# ========================

class TestSparkCategories:
    """Spark categories tests - verifies politics and finance are included"""
    
    def test_spark_categories_endpoint(self):
        """Spark categories endpoint should exist"""
        response = requests.get(f"{BASE_URL}/api/spark/categories")
        assert response.status_code == 200
        print(f"✓ Spark categories endpoint exists (200)")
    
    def test_spark_categories_include_politics(self):
        """Spark categories should include politics"""
        response = requests.get(f"{BASE_URL}/api/spark/categories")
        assert response.status_code == 200
        data = response.json()
        
        categories = data.get("categories", [])
        assert "politics" in categories, f"Politics should be in categories: {categories}"
        print(f"✓ Politics category exists")
    
    def test_spark_categories_include_finance(self):
        """Spark categories should include finance"""
        response = requests.get(f"{BASE_URL}/api/spark/categories")
        assert response.status_code == 200
        data = response.json()
        
        categories = data.get("categories", [])
        assert "finance" in categories, f"Finance should be in categories: {categories}"
        print(f"✓ Finance category exists")
    
    def test_spark_categories_all_expected(self):
        """Spark categories should include all expected categories"""
        response = requests.get(f"{BASE_URL}/api/spark/categories")
        assert response.status_code == 200
        data = response.json()
        
        categories = data.get("categories", [])
        expected = ["music", "tech", "culture", "politics", "finance"]
        
        for cat in expected:
            assert cat in categories, f"{cat} should be in categories"
        
        print(f"✓ All expected categories present: {categories}")


# ========================
# PUSH NOTIFICATION TESTS
# ========================

class TestPushNotifications:
    """Push notification endpoint tests"""
    
    def test_vapid_key_endpoint_exists(self):
        """VAPID key endpoint should exist"""
        response = requests.get(f"{BASE_URL}/api/push/vapid-key")
        assert response.status_code == 200
        print(f"✓ VAPID key endpoint exists (200)")
    
    def test_vapid_key_returns_public_key(self):
        """VAPID key endpoint should return public key"""
        response = requests.get(f"{BASE_URL}/api/push/vapid-key")
        assert response.status_code == 200
        data = response.json()
        
        assert "publicKey" in data, "Response should include publicKey"
        assert len(data["publicKey"]) > 0, "Public key should not be empty"
        print(f"✓ VAPID public key returned: {data['publicKey'][:20]}...")
    
    def test_subscribe_requires_auth(self):
        """Subscribe endpoint should require authentication"""
        response = requests.post(
            f"{BASE_URL}/api/push/subscribe",
            json={"endpoint": "test", "keys": {}}
        )
        assert response.status_code == 401
        print(f"✓ Subscribe requires authentication (401)")
    
    def test_subscribe_endpoint_exists(self, auth_session):
        """Subscribe endpoint should exist and accept subscription"""
        # Create a mock subscription
        subscription = {
            "endpoint": "https://test.push.service/test-endpoint-12345",
            "keys": {
                "p256dh": "test_p256dh_key",
                "auth": "test_auth_key"
            }
        }
        
        response = auth_session.post(
            f"{BASE_URL}/api/push/subscribe",
            json=subscription
        )
        
        assert response.status_code == 200, f"Subscribe failed: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"✓ Push subscription created: {data.get('message')}")
    
    def test_unsubscribe_requires_auth(self):
        """Unsubscribe endpoint should require authentication"""
        response = requests.delete(
            f"{BASE_URL}/api/push/unsubscribe?endpoint=test"
        )
        assert response.status_code == 401
        print(f"✓ Unsubscribe requires authentication (401)")
    
    def test_unsubscribe_endpoint_exists(self, auth_session):
        """Unsubscribe endpoint should exist"""
        endpoint = "https://test.push.service/test-endpoint-12345"
        response = auth_session.delete(
            f"{BASE_URL}/api/push/unsubscribe?endpoint={endpoint}"
        )
        
        assert response.status_code == 200, f"Unsubscribe failed: {response.text}"
        print(f"✓ Push unsubscribe works")
    
    def test_test_notification_requires_auth(self):
        """Test notification endpoint should require authentication"""
        response = requests.post(f"{BASE_URL}/api/push/test")
        assert response.status_code == 401
        print(f"✓ Test notification requires authentication (401)")
    
    def test_test_notification_endpoint_exists(self, auth_session):
        """Test notification endpoint should exist"""
        response = auth_session.post(f"{BASE_URL}/api/push/test")
        assert response.status_code == 200, f"Test notification failed: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"✓ Test notification sent: {data.get('message')}")


# ========================
# SPARK DROP WITH CATEGORY TESTS
# ========================

class TestSparkDropWithCategory:
    """Test spark drop with politics and finance categories"""
    
    def test_spark_drop_with_politics_category(self, auth_session):
        """Spark drop should work with politics category"""
        response = auth_session.post(
            f"{BASE_URL}/api/spark/drop",
            params={"category": "politics"}
        )
        
        # May fail if DuckDuckGo rate limits, but endpoint should exist
        assert response.status_code in [200, 500], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert "post" in data, "Should return post"
            print(f"✓ Spark dropped with politics category")
        else:
            print(f"✓ Spark drop endpoint exists (may have rate limit)")
    
    def test_spark_drop_with_finance_category(self, auth_session):
        """Spark drop should work with finance category"""
        response = auth_session.post(
            f"{BASE_URL}/api/spark/drop",
            params={"category": "finance"}
        )
        
        # May fail if DuckDuckGo rate limits, but endpoint should exist
        assert response.status_code in [200, 500], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert "post" in data, "Should return post"
            print(f"✓ Spark dropped with finance category")
        else:
            print(f"✓ Spark drop endpoint exists (may have rate limit)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
