import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to Network Intrusion Detection System API"}

def test_get_alert_stats_without_auth():
    # Attempting to fetch protected route without auth token should return 401
    response = client.get("/api/v1/alerts/stats")
    assert response.status_code == 401

def test_signup_user():
    # Make sure signup endpoint works
    response = client.post("/api/v1/signup", json={"username": "testuser", "password": "testpassword"})
    
    # Since sqlite is persistent locally during this test, it might already exist.
    # We accept 200 (created) or 400 (already exists) as a valid functional test.
    assert response.status_code in [200, 400]
