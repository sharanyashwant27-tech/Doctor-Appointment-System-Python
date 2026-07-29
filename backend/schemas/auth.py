"""Auth request/response schemas."""
from typing import Optional

from pydantic import BaseModel, Field

from models.user import UserRole
from schemas.common import EmailStr
from schemas.user import UserRead


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=255)
    phone: Optional[str] = None
    role: UserRole = UserRole.patient
    specialty: Optional[str] = None  # required when role=doctor


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    otp: Optional[str] = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


class VerifyEmailRequest(BaseModel):
    token: str


class TwoFAEnableRequest(BaseModel):
    code: str


class TwoFADisableRequest(BaseModel):
    password: str


class FcmTokenRequest(BaseModel):
    token: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


class MeResponse(UserRead):
    pass
