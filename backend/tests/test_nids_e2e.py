import pytest
import requests
from pathlib import Path

BASE_URL = "http://localhost:8000"

class TestAuthFlow:
    def test_login_success(self):
        resp = requests.post(f"{BASE_URL}/api/v1/login/access-token", data={"username": "admin", "password": "admin123"})
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_invalid_creds_returns_401(self):
        resp = requests.post(f"{BASE_URL}/api/v1/login/access-token", data={"username": "admin", "password": "wrong"})
        assert resp.status_code == 401

    def test_login_httponly_cookie_set(self):
        resp = requests.post(f"{BASE_URL}/api/v1/login/access-token", data={"username": "admin", "password": "admin123"})
        assert resp.status_code == 200
        set_cookie = resp.headers.get("set-cookie", "")
        assert "httponly" in set_cookie.lower()

class TestSecurityHeaders:
    def test_security_headers_present(self):
        resp = requests.get(f"{BASE_URL}/")
        assert resp.headers.get("X-Content-Type-Options") == "nosniff"
        assert resp.headers.get("X-Frame-Options") == "DENY"
        assert "x-xss-protection" in resp.headers
        assert "referrer-policy" in resp.headers

class TestAuthEnforcement:
    def test_stats_requires_auth(self):
        resp = requests.get(f"{BASE_URL}/api/v1/traffic/stats")
        assert resp.status_code in (401, 403)

    def test_alerts_requires_auth(self):
        resp = requests.get(f"{BASE_URL}/api/v1/traffic/alerts")
        assert resp.status_code in (401, 403)

    def test_timeline_requires_auth(self):
        resp = requests.get(f"{BASE_URL}/api/v1/traffic/timeline")
        assert resp.status_code in (401, 403)

    def test_invalid_token_returns_401(self):
        headers = {"Authorization": "Bearer invalid.token.here"}
        resp = requests.get(f"{BASE_URL}/api/v1/traffic/stats", headers=headers)
        assert resp.status_code in (401, 403)

    def test_valid_token_grants_access(self):
        login_resp = requests.post(f"{BASE_URL}/api/v1/login/access-token", data={"username": "admin", "password": "admin123"})
        assert login_resp.status_code == 200
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        resp = requests.get(f"{BASE_URL}/api/v1/traffic/stats", headers=headers)
        assert resp.status_code == 200

class TestProtectedEndpoints:
    @pytest.fixture
    def auth_headers(self):
        resp = requests.post(f"{BASE_URL}/api/v1/login/access-token", data={"username": "admin", "password": "admin123"})
        assert resp.status_code == 200
        token = resp.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    def test_stats_endpoint_returns_data(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/v1/traffic/stats", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "total_packets" in data

    def test_alerts_endpoint_returns_data(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/v1/traffic/alerts", headers=auth_headers)
        assert resp.status_code == 200
        assert "alerts" in resp.json()

    def test_timeline_endpoint_returns_data(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/v1/traffic/timeline", headers=auth_headers)
        assert resp.status_code == 200
        assert "timeline" in resp.json()

class TestMLModel:
    def test_model_file_exists(self):
        model_path = Path(__file__).parent.parent / "app" / "shared-models" / "nids_xgb.pkl"
        assert model_path.exists(), f"Model not found at {model_path}"

    def test_model_loads_successfully(self):
        import joblib
        model_path = Path(__file__).parent.parent / "app" / "shared-models" / "nids_xgb.pkl"
        model = joblib.load(model_path)
        assert model is not None

class TestDatabaseConnection:
    def test_db_connection_works(self):
        from app.db.session import SessionLocal
        from sqlalchemy import text
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
