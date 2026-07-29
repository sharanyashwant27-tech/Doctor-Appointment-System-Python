"""Auth service — register/login/refresh/logout with RefreshToken persistence."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from utils.config import settings
from utils.exceptions import ConflictError, UnauthorizedError, ValidationAppError
from auth.security import (
    create_token_pair,
    hash_password,
    hash_token,
    verify_password,
    verify_refresh_token,
)
from models.doctor import DoctorProfile
from models.patient import PatientProfile
from models.refresh_token import RefreshToken
from models.user import User, UserRole
from schemas.auth import LoginRequest, RegisterRequest, TokenPair
from services.audit_service import write_audit


def _persist_refresh(db: Session, user: User, refresh_token: str, jti: str) -> RefreshToken:
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    row = RefreshToken(
        user_id=user.id,
        jti=jti,
        token_hash=hash_token(refresh_token),
        expires_at=expires_at,
    )
    db.add(row)
    return row


def register_user(db: Session, payload: RegisterRequest) -> User:
    if payload.role == UserRole.admin:
        raise ValidationAppError("Cannot self-register as admin")
    if payload.role == UserRole.doctor and not payload.specialty:
        raise ValidationAppError("specialty is required for doctor registration")

    existing = db.scalar(select(User).where(User.email == payload.email.lower()))
    if existing:
        raise ConflictError("Email already registered")

    user = User(
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        phone=payload.phone,
        role=payload.role,
        is_active=True,
    )
    db.add(user)
    db.flush()

    if payload.role == UserRole.doctor:
        db.add(
            DoctorProfile(
                user_id=user.id,
                specialty=payload.specialty or "General",
                is_verified=False,
            )
        )
    elif payload.role == UserRole.patient:
        db.add(PatientProfile(user_id=user.id))

    write_audit(
        db,
        actor_user_id=user.id,
        action="user.register",
        entity_type="user",
        entity_id=str(user.id),
        details={"role": payload.role.value, "email": user.email},
    )
    db.commit()
    db.refresh(user)
    return user


def login_user(db: Session, payload: LoginRequest) -> TokenPair:
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise UnauthorizedError("Invalid email or password")
    if not user.is_active:
        raise UnauthorizedError("Account is inactive")

    if getattr(user, "totp_enabled", False):
        from utils.exceptions import ForbiddenError
        import pyotp

        if not getattr(payload, "otp", None):
            raise ForbiddenError("Two-factor authentication required", details={"code": "needing_2fa"})
        if not user.totp_secret or not pyotp.TOTP(user.totp_secret).verify(payload.otp, valid_window=1):
            raise UnauthorizedError("Invalid OTP code")

    role = user.role.value if isinstance(user.role, UserRole) else str(user.role)
    access, refresh, jti = create_token_pair(user.id, role)
    _persist_refresh(db, user, refresh, jti)
    write_audit(
        db,
        actor_user_id=user.id,
        action="user.login",
        entity_type="user",
        entity_id=str(user.id),
    )
    db.commit()
    return TokenPair(access_token=access, refresh_token=refresh)


def issue_tokens_for_user(db: Session, user: User, *, action: str = "user.face_login") -> TokenPair:
    """Issue JWT pair for an already-authenticated user (e.g. face login)."""
    if not user.is_active:
        raise UnauthorizedError("Account is inactive")
    role = user.role.value if isinstance(user.role, UserRole) else str(user.role)
    access, refresh, jti = create_token_pair(user.id, role)
    _persist_refresh(db, user, refresh, jti)
    write_audit(db, actor_user_id=user.id, action=action, entity_type="user", entity_id=str(user.id))
    db.commit()
    return TokenPair(access_token=access, refresh_token=refresh)


def refresh_tokens(db: Session, refresh_token: str) -> TokenPair:
    payload = verify_refresh_token(refresh_token)
    jti = payload["jti"]
    user_id = int(payload["sub"])

    row = db.scalar(select(RefreshToken).where(RefreshToken.jti == jti))
    if row is None or row.revoked_at is not None:
        raise UnauthorizedError("Refresh token revoked or unknown")
    if row.token_hash != hash_token(refresh_token):
        raise UnauthorizedError("Refresh token mismatch")
    expires = row.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        raise UnauthorizedError("Refresh token expired")

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise UnauthorizedError("User not found or inactive")

    row.revoked_at = datetime.now(timezone.utc)
    role = user.role.value if isinstance(user.role, UserRole) else str(user.role)
    access, new_refresh, new_jti = create_token_pair(user.id, role)
    _persist_refresh(db, user, new_refresh, new_jti)
    db.commit()
    return TokenPair(access_token=access, refresh_token=new_refresh)


def logout_user(db: Session, refresh_token: str) -> None:
    try:
        payload = verify_refresh_token(refresh_token)
    except UnauthorizedError:
        return
    jti = payload.get("jti")
    if not jti:
        return
    row = db.scalar(select(RefreshToken).where(RefreshToken.jti == jti))
    if row and row.revoked_at is None:
        row.revoked_at = datetime.now(timezone.utc)
        write_audit(
            db,
            actor_user_id=row.user_id,
            action="user.logout",
            entity_type="user",
            entity_id=str(row.user_id),
        )
        db.commit()
