def test_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to Network Intrusion Detection System API"}


def test_signup(client):
    response = client.post(
        "/api/v1/signup",
        json={"username": "testuser", "password": "testpass123"},
    )
    assert response.status_code == 200
    assert response.json()["msg"] == "User created successfully. Please login."


def test_signup_duplicate_user(client):
    client.post("/api/v1/signup", json={"username": "dupeuser", "password": "pass"})
    response = client.post("/api/v1/signup", json={"username": "dupeuser", "password": "pass"})
    assert response.status_code == 400


def test_login(client):
    client.post("/api/v1/signup", json={"username": "loginuser", "password": "mypassword"})
    response = client.post(
        "/api/v1/login/access-token",
        data={"username": "loginuser", "password": "mypassword"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password(client):
    client.post("/api/v1/signup", json={"username": "wrongpass", "password": "correct"})
    response = client.post(
        "/api/v1/login/access-token",
        data={"username": "wrongpass", "password": "wrong"},
    )
    assert response.status_code == 400


def test_alerts_requires_auth(client):
    response = client.get("/api/v1/alerts/recent")
    assert response.status_code == 401


def test_alerts_stats_requires_auth(client):
    response = client.get("/api/v1/alerts/stats")
    assert response.status_code == 401
