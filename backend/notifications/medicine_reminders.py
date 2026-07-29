"""Celery task — medicine reminder fan-out (demo)."""
from __future__ import annotations

from datetime import datetime, timezone

from notifications.celery_app import celery_app
from middleware.logging import get_logger

logger = get_logger(__name__)


@celery_app.task(name="notifications.dispatch_medicine_reminders")
def dispatch_medicine_reminders() -> dict:
    """Find due medicine reminders and create in-app notifications."""
    from database.session import SessionLocal
    from models.advanced import MedicineReminder
    from models.notification import Notification
    from models.patient import PatientProfile
    from sqlalchemy import select

    db = SessionLocal()
    sent = 0
    try:
        now = datetime.now(timezone.utc)
        current = now.strftime("%H:%M")
        rows = list(db.scalars(select(MedicineReminder).where(MedicineReminder.is_active.is_(True))).all())
        for rem in rows:
            sched = rem.schedule_time.strftime("%H:%M") if rem.schedule_time else ""
            if sched != current:
                continue
            patient = db.get(PatientProfile, rem.patient_id)
            if not patient:
                continue
            db.add(
                Notification(
                    user_id=patient.user_id,
                    title="Medicine reminder",
                    message=f"Time to take {rem.medicine_name}" + (f" ({rem.dosage})" if rem.dosage else ""),
                    type="reminder",
                    channel="in_app",
                    is_read=False,
                    sent_at=now,
                )
            )
            rem.last_notified_at = now
            sent += 1
        db.commit()
    finally:
        db.close()
    logger.info("medicine reminders dispatched=%s", sent)
    return {"sent": sent}
