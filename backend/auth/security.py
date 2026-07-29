"""JWT create/verify/refresh + password hashing (D9: hashed refresh + jti)."""
from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from uuid import uuid4

from jose import JWTError, jwt
from passlib.context import CryptContext

from utils.config import settings
from utils.exceptions import UnauthorizedError

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"
TOKEN_TYPE_ACCESS = "access"
TOKEN_TYPE_REFRESH = "refresh"


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def generate_jti() -> str:
    return uuid4().hex


def hash_token(raw_token: str) -> str:
    """Store only SHA-256 of refresh tokens in DB (D9)."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def new_refresh_raw() -> str:
    """Optional opaque secret paired with JWT refresh (W4 may use JWT-only)."""
    return secrets.token_urlsafe(48)


def create_access_token(subject: str, extra: Optional[dict[str, Any]] = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload: dict[str, Any] = {
        "sub": str(subject),
        "exp": expire,
        "type": TOKEN_TYPE_ACCESS,
        "iat": datetime.now(timezone.utc),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(subject: str, jti: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": str(subject),
        "exp": expire,
        "type": TOKEN_TYPE_REFRESH,
        "jti": jti,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise UnauthorizedError("Invalid or expired token") from exc


def verify_access_token(token: str) -> dict[str, Any]:
    payload = decode_token(token)
    if payload.get("type") != TOKEN_TYPE_ACCESS:
        raise UnauthorizedError("Access token required")
    if not payload.get("sub"):
        raise UnauthorizedError("Invalid access token subject")
    return payload


def verify_refresh_token(token: str) -> dict[str, Any]:
    payload = decode_token(token)
    if payload.get("type") != TOKEN_TYPE_REFRESH:
        raise UnauthorizedError("Refresh token required")
    if not payload.get("sub") or not payload.get("jti"):
        raise UnauthorizedError("Invalid refresh token claims")
    return payload


def create_token_pair(user_id: int, role: str, jti: Optional[str] = None) -> tuple[str, str, str]:
    """Return (access_token, refresh_token, jti). Persist hash_token(refresh) + jti in W4."""
    jti = jti or generate_jti()
    access = create_access_token(str(user_id), extra={"role": role})
    refresh = create_refresh_token(str(user_id), jti=jti)
    return access, refresh, jti
