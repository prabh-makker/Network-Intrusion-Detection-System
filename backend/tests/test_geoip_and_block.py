"""Tests for geoip_lookup and block_threat endpoints.

geoip_lookup — public endpoint, IP validation, in-process cache, external API proxy
block_threat  — auth-gated, UUID validation, firewall integration, DB update
"""
import uuid
import pytest
from unittest.mock import MagicMock, patch

from app.api.v1.endpoints.alerts import _geoip_cache


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_alert(db, alert_id=None, src_ip="1.2.3.4", is_blocked=False):
    """Insert a ThreatLog row and return it."""
    from app.models.models import ThreatLog
    from datetime import datetime

    row = ThreatLog(
        id=alert_id or uuid.uuid4(),
        src_ip=src_ip,
        dst_ip="5.6.7.8",
        protocol="TCP",
        label="DoS",
        confidence=0.95,
        is_blocked=is_blocked,
        timestamp=datetime.utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _auth_headers(client):
    """Create a fresh user and return Bearer token headers."""
    client.post(
        "/api/v1/signup",
        json={
            "username": "blocktest_user",
            "password": "Blocktest1",
            "email": "blocktest@test.com",
            "security_question": "Pet?",
            "security_answer": "cat",
        },
    )
    resp = client.post(
        "/api/v1/login/access-token",
        data={"username": "blocktest_user", "password": "Blocktest1"},
    )
    token = resp.json().get("access_token", "")
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# geoip_lookup — IP validation
# ---------------------------------------------------------------------------

class TestGeoIPIPValidation:

    def test_invalid_format_returns_400(self, client):
        resp = client.get("/api/v1/alerts/geoip/not-an-ip")
        assert resp.status_code == 400
        assert "Invalid IP" in resp.json()["detail"]

    def test_private_ip_rejected(self, client):
        for ip in ("192.168.1.1", "10.0.0.1", "172.16.0.1"):
            resp = client.get(f"/api/v1/alerts/geoip/{ip}")
            assert resp.status_code == 400, f"{ip} should be rejected"

    def test_loopback_rejected(self, client):
        resp = client.get("/api/v1/alerts/geoip/127.0.0.1")
        assert resp.status_code == 400
        # Python 3.11: 127.0.0.1 is_private fires before is_loopback
        detail = resp.json()["detail"].lower()
        assert "loopback" in detail or "private" in detail

    def test_multicast_rejected(self, client):
        resp = client.get("/api/v1/alerts/geoip/224.0.0.1")
        assert resp.status_code == 400

    def test_unspecified_rejected(self, client):
        resp = client.get("/api/v1/alerts/geoip/0.0.0.0")
        assert resp.status_code == 400

    def test_link_local_rejected(self, client):
        resp = client.get("/api/v1/alerts/geoip/169.254.1.1")
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# geoip_lookup — cache behaviour
# ---------------------------------------------------------------------------

class TestGeoIPCache:

    def setup_method(self):
        _geoip_cache.clear()

    def test_cache_hit_skips_external_call(self, client):
        _geoip_cache["8.8.8.8"] = {"country": "US", "city": "Mountain View"}

        with patch("app.api.v1.endpoints.alerts.http_requests.get") as mock_get:
            resp = client.get("/api/v1/alerts/geoip/8.8.8.8")

        mock_get.assert_not_called()
        assert resp.status_code == 200
        assert resp.json()["country"] == "US"

    def test_cache_miss_calls_external_api(self, client):
        mock_response = MagicMock()
        mock_response.json.return_value = {"country": "DE", "city": "Berlin"}

        with patch("app.api.v1.endpoints.alerts.http_requests.get", return_value=mock_response):
            resp = client.get("/api/v1/alerts/geoip/8.8.4.4")

        assert resp.status_code == 200
        assert resp.json()["country"] == "DE"

    def test_result_stored_in_cache_after_lookup(self, client):
        mock_response = MagicMock()
        mock_response.json.return_value = {"country": "JP", "city": "Tokyo"}

        with patch("app.api.v1.endpoints.alerts.http_requests.get", return_value=mock_response):
            client.get("/api/v1/alerts/geoip/1.1.1.1")

        assert "1.1.1.1" in _geoip_cache
        assert _geoip_cache["1.1.1.1"]["country"] == "JP"

    def test_external_api_failure_returns_502(self, client):
        with patch(
            "app.api.v1.endpoints.alerts.http_requests.get",
            side_effect=Exception("timeout"),
        ):
            resp = client.get("/api/v1/alerts/geoip/8.8.8.8")

        assert resp.status_code == 502
        assert "GeoIP" in resp.json()["detail"]

    def test_cache_cap_at_1000(self, client):
        """Cache must not exceed 1000 entries."""
        # Pre-fill to exactly 1000 (using fake IPs that pass validation)
        for i in range(1000):
            _geoip_cache[f"fake_{i}"] = {"country": "XX"}

        mock_response = MagicMock()
        mock_response.json.return_value = {"country": "AU"}

        with patch("app.api.v1.endpoints.alerts.http_requests.get", return_value=mock_response):
            client.get("/api/v1/alerts/geoip/8.8.8.8")

        # Overflow entry must NOT be cached
        assert "8.8.8.8" not in _geoip_cache
        assert len(_geoip_cache) == 1000


# ---------------------------------------------------------------------------
# block_threat
# ---------------------------------------------------------------------------

class TestBlockThreat:

    def test_requires_auth(self, client):
        fake_id = str(uuid.uuid4())
        resp = client.post(f"/api/v1/alerts/{fake_id}/block")
        assert resp.status_code == 401

    def test_invalid_uuid_returns_400(self, client):
        headers = _auth_headers(client)
        resp = client.post("/api/v1/alerts/not-a-uuid/block", headers=headers)
        assert resp.status_code == 400
        assert "UUID" in resp.json()["detail"]

    def test_nonexistent_alert_returns_404(self, client):
        headers = _auth_headers(client)
        resp = client.post(f"/api/v1/alerts/{uuid.uuid4()}/block", headers=headers)
        assert resp.status_code == 404

    def test_block_sets_is_blocked_true(self, client, db_session):
        headers = _auth_headers(client)
        alert = _make_alert(db_session, src_ip="8.8.8.8")

        with patch("app.api.v1.endpoints.alerts.firewall_service.block_ip", return_value=True):
            resp = client.post(f"/api/v1/alerts/{alert.id}/block", headers=headers)

        assert resp.status_code == 200
        assert resp.json()["status"] == "blocked"
        assert resp.json()["ip"] == "8.8.8.8"

    def test_block_calls_firewall_service(self, client, db_session):
        headers = _auth_headers(client)
        alert = _make_alert(db_session, src_ip="203.0.113.5")

        with patch(
            "app.api.v1.endpoints.alerts.firewall_service.block_ip", return_value=True
        ) as mock_fw:
            client.post(f"/api/v1/alerts/{alert.id}/block", headers=headers)

        mock_fw.assert_called_once_with("203.0.113.5")

    def test_firewall_status_included_in_response(self, client, db_session):
        headers = _auth_headers(client)
        alert = _make_alert(db_session)

        with patch(
            "app.api.v1.endpoints.alerts.firewall_service.block_ip", return_value=False
        ):
            resp = client.post(f"/api/v1/alerts/{alert.id}/block", headers=headers)

        assert "firewall_active" in resp.json()
        assert resp.json()["firewall_active"] is False

    def test_already_blocked_alert_can_be_reblocked(self, client, db_session):
        """Endpoint has no guard against double-blocking; just updates the row."""
        headers = _auth_headers(client)
        alert = _make_alert(db_session, is_blocked=True)

        with patch("app.api.v1.endpoints.alerts.firewall_service.block_ip", return_value=True):
            resp = client.post(f"/api/v1/alerts/{alert.id}/block", headers=headers)

        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Conftest override — expose db_session to these tests
# ---------------------------------------------------------------------------

@pytest.fixture()
def db_session():
    from tests.conftest import TestingSessionLocal
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
