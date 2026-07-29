"""Notifications API."""
from typing import List

from fastapi import APIRouter, Query

from api.deps import CurrentUser, DbSession
from schemas.common import Message
from schemas.notification import NotificationRead
from notifications import notification_service

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/", response_model=List[NotificationRead])
def list_notifications(user: CurrentUser, db: DbSession, unread_only: bool = Query(False)):
    return notification_service.list_for_user(db, user.id, unread_only=unread_only)


@router.patch("/{notification_id}/read", response_model=NotificationRead)
def mark_read(notification_id: int, user: CurrentUser, db: DbSession):
    return notification_service.mark_read(db, user.id, notification_id)


@router.post("/read-all", response_model=Message)
def read_all(user: CurrentUser, db: DbSession):
    n = notification_service.mark_all_read(db, user.id)
    return Message(message=f"Marked {n} notifications as read")
