"""In-app notification service."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from utils.exceptions import NotFoundError
from models.notification import Notification


def create_notification(
    db: Session,
    *,
    user_id: int,
    title: str,
    message: str,
    type: str = "info",
    channel: str = "in_app",
    scheduled_for: Optional[datetime] = None,
    meta: Optional[Any] = None,
    commit: bool = False,
) -> Notification:
    row = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=type,
        channel=channel,
        scheduled_for=scheduled_for,
        sent_at=datetime.now(timezone.utc) if channel == "in_app" and scheduled_for is None else None,
        meta=meta,
    )
    db.add(row)
    if commit:
        db.commit()
        db.refresh(row)
    return row


def list_for_user(db: Session, user_id: int, *, unread_only: bool = False) -> list[Notification]:
    q = select(Notification).where(Notification.user_id == user_id).order_by(Notification.created_at.desc())
    if unread_only:
        q = q.where(Notification.is_read.is_(False))
    return list(db.scalars(q).all())


def mark_read(db: Session, user_id: int, notification_id: int) -> Notification:
    row = db.get(Notification, notification_id)
    if row is None or row.user_id != user_id:
        raise NotFoundError("Notification not found")
    row.is_read = True
    db.commit()
    db.refresh(row)
    return row


def mark_all_read(db: Session, user_id: int) -> int:
    result = db.execute(
        update(Notification)
        .where(Notification.user_id == user_id, Notification.is_read.is_(False))
        .values(is_read=True)
    )
    db.commit()
    return int(result.rowcount or 0)
