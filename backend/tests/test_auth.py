"""Auth: register, login, refresh, logout, invalid credentials, health."""


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert "app" in body


def test_ready(client):
    r = client.get("/ready")
    assert r.status_code == 200
    assert r.json()["status"] in {"ready", "not_ready"}


def test_register_patient(client):
    r = client.post(
        "/api/v1/auth/register",
        json={
            "email": "newpatient@example.com",
            "password": "Patient@123",
            "full_name": "New Patient",
            "role": "patient",
        },
    )
    assert r.status_code == 201
    data = r.json()
    assert data["email"] == "newpatient@example.com"
    assert data["role"] == "patient"
    assert data["is_active"] is True


def test_register_doctor_requires_specialty(client):
    r = client.post(
        "/api/v1/auth/register",
        json={
            "email": "nospec@example.com",
            "password": "Doctor@123",
            "full_name": "No Spec",
            "role": "doctor",
        },
    )
    assert r.status_code == 422


def test_register_admin_forbidden(client):
    r = client.post(
        "/api/v1/auth/register",
        json={
            "email": "evil@example.com",
            "password": "Admin@1234",
            "full_name": "Evil Admin",
            "role": "admin",
        },
    )
    assert r.status_code == 422


def test_register_duplicate_email(client):
    payload = {
        "email": "dup@example.com",
        "password": "Patient@123",
        "full_name": "Dup",
        "role": "patient",
    }
    assert client.post("/api/v1/auth/register", json=payload).status_code == 201
    r = client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 409


def test_login_returns_token_pair(client):
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "loginme@example.com",
            "password": "Patient@123",
            "full_name": "Login Me",
            "role": "patient",
        },
    )
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "loginme@example.com", "password": "Patient@123"},
    )
    assert login.status_code == 200
    tokens = login.json()
    assert tokens["token_type"] == "bearer"
    assert tokens["access_token"]
    assert tokens["refresh_token"]


def test_login_invalid_credentials(client):
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "badcred@example.com",
            "password": "Patient@123",
            "full_name": "Bad Cred",
            "role": "patient",
        },
    )
    r = client.post(
        "/api/v1/auth/login",
        json={"email": "badcred@example.com", "password": "WrongPass1"},
    )
    assert r.status_code == 401
    assert r.json()["code"] == "unauthorized"


def test_login_unknown_user(client):
    r = client.post(
        "/api/v1/auth/login",
        json={"email": "missing@example.com", "password": "Patient@123"},
    )
    assert r.status_code == 401


def test_me_with_access_token(client):
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "meuser@example.com",
            "password": "Patient@123",
            "full_name": "Me User",
            "role": "patient",
        },
    )
    tokens = client.post(
        "/api/v1/auth/login",
        json={"email": "meuser@example.com", "password": "Patient@123"},
    ).json()
    me = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )
    assert me.status_code == 200
    assert me.json()["email"] == "meuser@example.com"
    assert me.json()["role"] == "patient"


def test_me_requires_auth(client):
    assert client.get("/api/v1/auth/me").status_code == 401


def test_refresh_rotates_tokens(client):
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "refresh@example.com",
            "password": "Patient@123",
            "full_name": "Refresh User",
            "role": "patient",
        },
    )
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "refresh@example.com", "password": "Patient@123"},
    ).json()
    old_refresh = login["refresh_token"]

    refreshed = client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})
    assert refreshed.status_code == 200
    new_tokens = refreshed.json()
    assert new_tokens["access_token"]
    assert new_tokens["refresh_token"]
    assert new_tokens["refresh_token"] != old_refresh

    # old refresh should be revoked after rotation
    reuse = client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})
    assert reuse.status_code == 401


def test_logout_revokes_refresh(client):
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "logout@example.com",
            "password": "Patient@123",
            "full_name": "Logout User",
            "role": "patient",
        },
    )
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "logout@example.com", "password": "Patient@123"},
    ).json()
    refresh = login["refresh_token"]

    out = client.post("/api/v1/auth/logout", json={"refresh_token": refresh})
    assert out.status_code == 200
    assert out.json()["message"] == "Logged out"

    again = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
    assert again.status_code == 401
