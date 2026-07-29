"""Auth extensions — forgot password, email verify, 2FA."""
from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone

import pyotp
from sqlalchemy import select
from sqlalchemy.orm import Session

from utils.config import settings
from utils.exceptions import NotFoundError, UnauthorizedError, ValidationAppError
from auth.security import hash_password, hash_token, verify_password
from models.clinical import EmailVerificationToken, PasswordResetToken
from models.user import User
from services.audit_service import write_audit
from notifications.email_service import send_email


def forgot_password(db: Session, email: str) -> dict:
    user = db.scalar(select(User).where(User.email == email.lower()))
    if user:
        raw = secrets.token_urlsafe(32)
        db.add(
            PasswordResetToken(
                user_id=user.id,
                token_hash=hash_token(raw),
                expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
            )
        )
        db.commit()
        link = f"http://localhost:8905/reset-password?token={raw}"
        send_email(user.email, "MediBook password reset", f"Reset your password: {link}\nToken: {raw}")
        out: dict = {"message": "If the account exists, a reset email was sent"}
        if settings.ENVIRONMENT == "development":
            out["dev_token"] = raw
        return out
    return {"message": "If the account exists, a reset email was sent"}


def reset_password(db: Session, token: str, new_password: str) -> dict:
    row = db.scalar(select(PasswordResetToken).where(PasswordResetToken.token_hash == hash_token(token)))
    if row is None or row.used_at is not None:
        raise ValidationAppError("Invalid or used reset token")
    exp = row.expires_at if row.expires_at.tzinfo else row.expires_at.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        raise ValidationAppError("Reset token expired")
    user = db.get(User, row.user_id)
    if user is None:
        raise NotFoundError("User not found")
    user.hashed_password = hash_password(new_password)
    row.used_at = datetime.now(timezone.utc)
    write_audit(db, actor_user_id=user.id, action="user.reset_password", entity_type="user", entity_id=str(user.id))
    db.commit()
    return {"message": "Password updated"}


def send_verification(db: Session, user: User) -> dict:
    raw = secrets.token_urlsafe(32)
    db.add(
        EmailVerificationToken(
            user_id=user.id,
            token_hash=hash_token(raw),
            expires_at=datetime.now(timezone.utc) + timedelta(days=2),
        )
    )
    db.commit()
    link = f"http://localhost:8905/verify-email?token={raw}"
    send_email(user.email, "Verify your MediBook email", f"Verify: {link}\nToken: {raw}")
    out: dict = {"message": "Verification email sent"}
    if settings.ENVIRONMENT == "development":
        out["dev_token"] = raw
    return out


def verify_email(db: Session, token: str) -> dict:
    row = db.scalar(select(EmailVerificationToken).where(EmailVerificationToken.token_hash == hash_token(token)))
    if row is None or row.used_at is not None:
        raise ValidationAppError("Invalid verification token")
    exp = row.expires_at if row.expires_at.tzinfo else row.expires_at.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        raise ValidationAppError("Verification token expired")
    user = db.get(User, row.user_id)
    if user is None:
        raise NotFoundError("User not found")
    user.email_verified = True
    row.used_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Email verified"}


def setup_2fa(db: Session, user: User) -> dict:
    secret = pyotp.random_base32()
    user.totp_secret = secret
    user.totp_enabled = False
    db.commit()
    uri = pyotp.TOTP(secret).provisioning_uri(name=user.email, issuer_name="MediBook")
    return {"secret": secret, "otpauth_url": uri}


def enable_2fa(db: Session, user: User, code: str) -> dict:
    if not user.totp_secret:
        raise ValidationAppError("Call 2FA setup first")
    if not pyotp.TOTP(user.totp_secret).verify(code, valid_window=1):
        raise ValidationAppError("Invalid OTP code")
    user.totp_enabled = True
    db.commit()
    return {"message": "2FA enabled"}


def disable_2fa(db: Session, user: User, password: str) -> dict:
    if not verify_password(password, user.hashed_password):
        raise UnauthorizedError("Invalid password")
    user.totp_enabled = False
    user.totp_secret = None
    db.commit()
    return {"message": "2FA disabled"}


def set_fcm_token(db: Session, user: User, token: str) -> dict:
    user.fcm_token = token
    db.commit()
    return {"message": "FCM token saved"}
