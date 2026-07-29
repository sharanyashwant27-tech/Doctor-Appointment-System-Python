"""Notification schemas."""
from datetime import datetime
from typing import Any, Optional

from schemas.common import ORMModel


class NotificationRead(ORMModel):
    id: int
    user_id: int
    title: str
    message: str
    type: str
    channel: str
    is_read: bool
    scheduled_for: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    meta: Optional[Any] = None
    created_at: Optional[datetime] = None
