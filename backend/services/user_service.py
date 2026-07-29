"""User management service."""
from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from utils.exceptions import NotFoundError
from models.user import User, UserRole
from schemas.user import UserUpdate
from services.audit_service import write_audit


def list_users(
    db: Session,
    *,
    role: Optional[UserRole] = None,
    skip: int = 0,
    limit: int = 100,
) -> list[User]:
    q = select(User).order_by(User.id)
    if role:
        q = q.where(User.role == role)
    return list(db.scalars(q.offset(skip).limit(limit)).all())


def get_user(db: Session, user_id: int) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise NotFoundError("User not found")
    return user


def update_user(db: Session, user_id: int, payload: UserUpdate, actor_id: Optional[int] = None) -> User:
    user = get_user(db, user_id)
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(user, k, v)
    write_audit(
        db,
        actor_user_id=actor_id,
        action="user.update",
        entity_type="user",
        entity_id=str(user.id),
        details=data,
    )
    db.commit()
    db.refresh(user)
    return user


def set_active(db: Session, user_id: int, is_active: bool, actor_id: Optional[int] = None) -> User:
    user = get_user(db, user_id)
    user.is_active = is_active
    write_audit(
        db,
        actor_user_id=actor_id,
        action="user.activate" if is_active else "user.deactivate",
        entity_type="user",
        entity_id=str(user.id),
    )
    db.commit()
    db.refresh(user)
    return user
