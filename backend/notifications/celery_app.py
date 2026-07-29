"""Celery application — Redis broker; CELERY_TASK_ALWAYS_EAGER for local (D5)."""
from celery import Celery

from utils.config import settings

celery_app = Celery(
    "medibook",
    broker=settings.CELERY_BROKER_URL or settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["notifications.reminders"],
)

celery_app.conf.update(
    task_always_eager=settings.CELERY_TASK_ALWAYS_EAGER,
    task_eager_propagates=True,
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        "dispatch-due-notifications": {
            "task": "notifications.reminders.dispatch_due_notifications",
            "schedule": 600.0,  # every 10 minutes
        },
        "cleanup-refresh-tokens": {
            "task": "notifications.reminders.cleanup_expired_refresh_tokens",
            "schedule": 3600.0,
        },
    },
)
