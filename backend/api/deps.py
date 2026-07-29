"""FastAPI dependencies — JWT auth + RBAC (D8/D9)."""
from __future__ import annotations

from typing import Annotated, Callable, Optional

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from utils.exceptions import ForbiddenError, UnauthorizedError
from auth.security import verify_access_token
from database.session import get_db
from models.user import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

DbSession = Annotated[Session, Depends(get_db)]


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not token:
        raise UnauthorizedError("Not authenticated")
    payload = verify_access_token(token)
    try:
        user_id = int(payload["sub"])
    except (TypeError, ValueError) as exc:
        raise UnauthorizedError("Invalid token subject") from exc

    user = db.get(User, user_id)
    if user is None:
        raise UnauthorizedError("User not found")
    return user


def get_current_active_user(user: User = Depends(get_current_user)) -> User:
    if not user.is_active:
        raise ForbiddenError("Inactive user")
    return user


def require_roles(*roles: str | UserRole) -> Callable[..., User]:
    """Dependency factory: require_roles('admin', 'doctor')."""
    allowed = {r.value if isinstance(r, UserRole) else str(r) for r in roles}

    def _dep(user: User = Depends(get_current_active_user)) -> User:
        role_val = user.role.value if isinstance(user.role, UserRole) else str(user.role)
        if role_val not in allowed:
            raise ForbiddenError("Insufficient permissions")
        return user

    return _dep


# Convenience typed aliases for routers
CurrentUser = Annotated[User, Depends(get_current_active_user)]
AdminUser = Annotated[User, Depends(require_roles("admin"))]
DoctorUser = Annotated[User, Depends(require_roles("doctor"))]
PatientUser = Annotated[User, Depends(require_roles("patient"))]
