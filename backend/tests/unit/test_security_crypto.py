"""Unit tests — JWT + bcrypt helpers (no HTTP)."""
from __future__ import annotations

import pytest

from auth.security import (
    create_token_pair,
    hash_password,
    hash_token,
    verify_access_token,
    verify_password,
    verify_refresh_token,
)
from utils.exceptions import UnauthorizedError


pytestmark = pytest.mark.unit


def test_bcrypt_hash_and_verify():
    hashed = hash_password("SecretPass1!")
    assert hashed != "SecretPass1!"
    assert verify_password("SecretPass1!", hashed) is True
    assert verify_password("wrong", hashed) is False


def test_token_pair_roundtrip():
    access, refresh, jti = create_token_pair(42, "patient")
    access_payload = verify_access_token(access)
    refresh_payload = verify_refresh_token(refresh)
    assert access_payload["sub"] == "42"
    assert access_payload["role"] == "patient"
    assert refresh_payload["jti"] == jti
    assert hash_token(refresh) != refresh


def test_access_token_rejected_as_refresh():
    access, refresh, _ = create_token_pair(1, "admin")
    with pytest.raises(UnauthorizedError):
        verify_refresh_token(access)
    with pytest.raises(UnauthorizedError):
        verify_access_token(refresh)


def test_invalid_token():
    with pytest.raises(UnauthorizedError):
        verify_access_token("not.a.jwt")
