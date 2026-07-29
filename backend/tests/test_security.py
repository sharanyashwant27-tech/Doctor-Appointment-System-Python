"""API security tests — CSRF origin + headers."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from models.user import UserRole
from utils import config as config_module


pytestmark = [pytest.mark.api, pytest.mark.security]


def test_csrf_token_endpoint(client: TestClient):
    r = client.get("/api/v1/security/csrf")
    assert r.status_code == 200
    assert "csrf_token" in r.json()


def test_security_headers_present(client: TestClient):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.headers.get("x-content-type-options") == "nosniff"
    assert r.headers.get("x-frame-options") == "DENY"


def test_csrf_rejects_evil_origin(client: TestClient, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(config_module.settings, "CSRF_ENABLED", True)
    evil = client.post(
        "/api/login",
        json={"email": "x@y.com", "password": "whatever1"},
        headers={"Origin": "https://evil.example"},
    )
    assert evil.status_code == 403
    assert evil.json().get("code") == "csrf_origin"


def test_csrf_allows_trusted_origin(client: TestClient, monkeypatch: pytest.MonkeyPatch, make_user):
    monkeypatch.setattr(config_module.settings, "CSRF_ENABLED", True)
    user = make_user(email="csrf-patient@test.local", password="Passw0rd!", role=UserRole.patient)
    r = client.post(
        "/api/login",
        json={"email": user.email, "password": "Passw0rd!"},
        headers={"Origin": "http://localhost:8905"},
    )
    assert r.status_code == 200
    assert "access_token" in r.json()


def test_rate_limit_helper_enforces_window():
    from middleware.rate_limit import RateLimitMiddleware

    mw = RateLimitMiddleware(app=None)  # type: ignore[arg-type]
    mw._auth_max, mw._auth_window = 2, 60
    assert mw._allow("burst:ip", 2, 60) is True
    assert mw._allow("burst:ip", 2, 60) is True
    assert mw._allow("burst:ip", 2, 60) is False
