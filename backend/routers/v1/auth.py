"""Auth API routes."""
from fastapi import APIRouter

from api.deps import CurrentUser, DbSession
from schemas.auth import (
    FcmTokenRequest,
    ForgotPasswordRequest,
    LoginRequest,
    LogoutRequest,
    MeResponse,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenPair,
    TwoFADisableRequest,
    TwoFAEnableRequest,
    VerifyEmailRequest,
)
from schemas.common import Message
from schemas.user import UserRead
from auth import auth_extras, auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserRead, status_code=201)
def register(payload: RegisterRequest, db: DbSession):
    return auth_service.register_user(db, payload)


@router.post("/login", response_model=TokenPair)
def login(payload: LoginRequest, db: DbSession):
    return auth_service.login_user(db, payload)


@router.post("/refresh", response_model=TokenPair)
def refresh(payload: RefreshRequest, db: DbSession):
    return auth_service.refresh_tokens(db, payload.refresh_token)


@router.post("/logout", response_model=Message)
def logout(payload: LogoutRequest, db: DbSession):
    auth_service.logout_user(db, payload.refresh_token)
    return Message(message="Logged out")


@router.get("/me", response_model=MeResponse)
def me(user: CurrentUser):
    return user


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: DbSession):
    return auth_extras.forgot_password(db, payload.email)


@router.post("/reset-password", response_model=Message)
def reset_password(payload: ResetPasswordRequest, db: DbSession):
    return auth_extras.reset_password(db, payload.token, payload.new_password)


@router.post("/send-verification")
def send_verification(user: CurrentUser, db: DbSession):
    return auth_extras.send_verification(db, user)


@router.post("/verify-email", response_model=Message)
def verify_email(payload: VerifyEmailRequest, db: DbSession):
    return auth_extras.verify_email(db, payload.token)


@router.post("/2fa/setup")
def twofa_setup(user: CurrentUser, db: DbSession):
    return auth_extras.setup_2fa(db, user)


@router.post("/2fa/enable", response_model=Message)
def twofa_enable(payload: TwoFAEnableRequest, user: CurrentUser, db: DbSession):
    return auth_extras.enable_2fa(db, user, payload.code)


@router.post("/2fa/disable", response_model=Message)
def twofa_disable(payload: TwoFADisableRequest, user: CurrentUser, db: DbSession):
    return auth_extras.disable_2fa(db, user, payload.password)


@router.post("/fcm-token", response_model=Message)
def fcm_token(payload: FcmTokenRequest, user: CurrentUser, db: DbSession):
    return auth_extras.set_fcm_token(db, user, payload.token)
