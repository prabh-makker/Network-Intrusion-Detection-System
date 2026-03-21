def test_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to Network Intrusion Detection System API"}


def _signup_payload(username, password, email=None):
    return {
        "username": username,
        "password": password,
        "email": email or f"{username}@test.com",
        "security_question": "What was the name of your first pet?",
        "security_answer": "fluffy",
    }


def test_signup(client):
    response = client.post(
        "/api/v1/signup",
        json=_signup_payload("testuser", "testpass123"),
    )
    assert response.status_code == 200
    assert response.json()["msg"] == "User created successfully. Please login."


def test_signup_duplicate_user(client):
    client.post("/api/v1/signup", json=_signup_payload("dupeuser", "pass"))
    response = client.post("/api/v1/signup", json=_signup_payload("dupeuser", "pass", "dupeuser2@test.com"))
    assert response.status_code == 400


def test_login(client):
    client.post("/api/v1/signup", json=_signup_payload("loginuser", "mypassword"))
    response = client.post(
        "/api/v1/login/access-token",
        data={"username": "loginuser", "password": "mypassword"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password(client):
    client.post("/api/v1/signup", json=_signup_payload("wrongpass", "correct"))
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
