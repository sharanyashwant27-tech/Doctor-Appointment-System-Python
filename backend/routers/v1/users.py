"""Users API (admin)."""
from typing import List, Optional

from fastapi import APIRouter, Query

from api.deps import AdminUser, DbSession
from models.user import UserRole
from schemas.user import UserActivate, UserRead, UserUpdate
from services import user_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/", response_model=List[UserRead])
def list_users(
    _: AdminUser,
    db: DbSession,
    role: Optional[UserRole] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    return user_service.list_users(db, role=role, skip=skip, limit=limit)


@router.get("/{user_id}", response_model=UserRead)
def get_user(user_id: int, _: AdminUser, db: DbSession):
    return user_service.get_user(db, user_id)


@router.patch("/{user_id}", response_model=UserRead)
def update_user(user_id: int, payload: UserUpdate, admin: AdminUser, db: DbSession):
    return user_service.update_user(db, user_id, payload, actor_id=admin.id)


@router.patch("/{user_id}/activate", response_model=UserRead)
def activate_user(user_id: int, payload: UserActivate, admin: AdminUser, db: DbSession):
    return user_service.set_active(db, user_id, payload.is_active, actor_id=admin.id)
