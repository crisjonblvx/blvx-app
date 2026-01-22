"""
Test suite for BLVX Branding & Launch Polish features
- Landing page branding
- OG meta tags
- PWA manifest
- Seed posts endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndBasics:
    """Basic health check tests"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "bonita" in data
        print(f"Health check passed: {data}")


class TestSeedStarterPosts:
    """Test seed-starter-posts endpoint"""
    
    def test_seed_endpoint_exists(self):
        """Test that seed endpoint responds"""
        response = requests.post(f"{BASE_URL}/api/seed-starter-posts")
        assert response.status_code == 200
        data = response.json()
        assert "seeded" in data
        assert "message" in data
        print(f"Seed endpoint response: {data}")
    
    def test_seed_returns_false_when_posts_exist(self):
        """Test that seed returns seeded=false when posts already exist"""
        response = requests.post(f"{BASE_URL}/api/seed-starter-posts")
        assert response.status_code == 200
        data = response.json()
        # Database already has 95+ posts, so seeded should be false
        assert data["seeded"] == False
        assert "already has" in data["message"].lower() or "no seeding" in data["message"].lower()
        print(f"Seed correctly returns false: {data}")


class TestStaticAssets:
    """Test static assets and PWA configuration"""
    
    def test_manifest_json_accessible(self):
        """Test that manifest.json is accessible"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        assert response.status_code == 200
        data = response.json()
        
        # Verify PWA configuration
        assert data["name"] == "BLVX"
        assert data["short_name"] == "BLVX"
        assert data["display"] == "standalone"
        assert data["theme_color"] == "#000000"
        assert data["background_color"] == "#000000"
        assert "icons" in data
        assert len(data["icons"]) >= 2
        print(f"Manifest.json valid: {data}")
    
    def test_manifest_has_correct_icons(self):
        """Test that manifest has correct icon configuration"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        assert response.status_code == 200
        data = response.json()
        
        icons = data["icons"]
        sizes = [icon["sizes"] for icon in icons]
        assert "192x192" in sizes
        assert "512x512" in sizes
        print(f"Icon sizes: {sizes}")
    
    def test_index_html_has_og_tags(self):
        """Test that index.html contains OG meta tags"""
        response = requests.get(f"{BASE_URL}/")
        assert response.status_code == 200
        html = response.text
        
        # Check for OG tags
        assert 'og:title' in html
        assert 'og:description' in html
        assert 'og:image' in html
        assert 'og:type' in html
        print("OG tags found in HTML")
    
    def test_index_html_has_twitter_cards(self):
        """Test that index.html contains Twitter card meta tags"""
        response = requests.get(f"{BASE_URL}/")
        assert response.status_code == 200
        html = response.text
        
        # Check for Twitter card tags
        assert 'twitter:card' in html
        assert 'twitter:title' in html
        assert 'twitter:description' in html
        assert 'twitter:image' in html
        print("Twitter card tags found in HTML")
    
    def test_index_html_has_manifest_link(self):
        """Test that index.html links to manifest.json"""
        response = requests.get(f"{BASE_URL}/")
        assert response.status_code == 200
        html = response.text
        
        assert 'manifest.json' in html
        print("Manifest link found in HTML")
    
    def test_logo_asset_accessible(self):
        """Test that logo asset is accessible"""
        response = requests.get(f"{BASE_URL}/assets/logo-white.png")
        # Should return 200 or redirect
        assert response.status_code in [200, 301, 302, 304]
        print(f"Logo asset status: {response.status_code}")


class TestFeedEndpoint:
    """Test feed endpoint to verify posts exist"""
    
    def test_feed_returns_posts(self):
        """Test that feed endpoint returns posts"""
        response = requests.get(f"{BASE_URL}/api/posts/feed")
        assert response.status_code == 200
        data = response.json()
        
        # Should have posts since database has 95+ posts
        assert "posts" in data
        assert len(data["posts"]) > 0
        print(f"Feed returned {len(data['posts'])} posts")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
