"""Reminder and maintenance Celery tasks."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import delete, select

from utils.config import settings
from middleware.logging import get_logger
from database.session import SessionLocal
from models.appointment import Appointment
from models.doctor import DoctorProfile
from models.notification import Notification
from models.patient import PatientProfile
from models.refresh_token import RefreshToken
from notifications.email_service import send_email
from notifications.push_service import send_push
from notifications.sms_service import send_sms
from notifications.celery_app import celery_app

logger = get_logger(__name__)


@celery_app.task(name="notifications.reminders.send_appointment_reminder_email", bind=True, max_retries=3)
def send_appointment_reminder_email(self, appointment_id: int) -> dict:
    db = SessionLocal()
    try:
        appt = db.get(Appointment, appointment_id)
        if appt is None:
            return {"status": "missing", "appointment_id": appointment_id}
        patient = db.get(PatientProfile, appt.patient_id)
        doctor = db.get(DoctorProfile, appt.doctor_id)
        email = patient.user.email if patient and patient.user else None
        doctor_name = doctor.user.full_name if doctor and doctor.user else "your doctor"
        when = appt.scheduled_at.isoformat() if appt.scheduled_at else ""
        body = (
            f"Reminder: you have an appointment with {doctor_name} at {when}.\n"
            f"Appointment ID: {appointment_id}\n"
            f"— MediBook"
        )
        if email:
            send_email(email, "MediBook appointment reminder", body)
        if patient and patient.user_id:
            db.add(
                Notification(
                    user_id=patient.user_id,
                    title="Appointment reminder",
                    message=body,
                    type="reminder",
                    channel="email",
                    sent_at=datetime.now(timezone.utc),
                    meta={"appointment_id": appointment_id},
                )
            )
            db.commit()
        return {"status": "sent", "appointment_id": appointment_id, "channel": "email", "to": email}
    except Exception as exc:  # noqa: BLE001
        logger.exception("reminder email failed: %s", exc)
        raise self.retry(exc=exc, countdown=30)
    finally:
        db.close()


@celery_app.task(name="notifications.reminders.send_appointment_reminder_sms")
def send_appointment_reminder_sms(appointment_id: int) -> dict:
    db = SessionLocal()
    try:
        appt = db.get(Appointment, appointment_id)
        if appt is None:
            return {"status": "missing", "appointment_id": appointment_id}
        patient = db.get(PatientProfile, appt.patient_id)
        phone = patient.user.phone if patient and patient.user else ""
        msg = f"MediBook reminder: appointment #{appointment_id} at {appt.scheduled_at}"
        sms_ok = send_sms(phone, msg) if phone else False
        # Optional FCM: device token may live in notification meta or user prefs later
        push_token = None
        if patient and patient.user:
            push_token = getattr(patient.user, "fcm_token", None)
        if push_token:
            send_push(push_token, "MediBook reminder", msg, {"appointment_id": str(appointment_id)})
        return {
            "status": "sent" if sms_ok else "skipped",
            "appointment_id": appointment_id,
            "channel": "sms",
            "to": phone,
        }
    finally:
        db.close()


@celery_app.task(name="notifications.reminders.dispatch_due_notifications")
def dispatch_due_notifications() -> dict:
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        due = list(
            db.scalars(
                select(Notification).where(
                    Notification.scheduled_for.is_not(None),
                    Notification.scheduled_for <= now,
                    Notification.sent_at.is_(None),
                )
            ).all()
        )
        for n in due:
            if n.channel == "email" and n.user and n.user.email:
                send_email(n.user.email, n.title, n.message)
            elif n.channel == "sms" and n.user and n.user.phone:
                send_sms(n.user.phone, n.message)
            n.sent_at = now
        db.commit()
        return {"status": "ok", "dispatched": len(due)}
    finally:
        db.close()


@celery_app.task(name="notifications.reminders.cleanup_expired_refresh_tokens")
def cleanup_expired_refresh_tokens() -> dict:
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        result = db.execute(delete(RefreshToken).where(RefreshToken.expires_at < now))
        db.commit()
        deleted = int(result.rowcount or 0)
        logger.info("cleanup_expired_refresh_tokens deleted=%s", deleted)
        return {"status": "ok", "deleted": deleted}
    finally:
        db.close()


def schedule_appointment_reminder(appointment_id: int, eta=None) -> str:
    async_result = send_appointment_reminder_email.apply_async(args=[appointment_id], eta=eta)
    send_appointment_reminder_sms.apply_async(args=[appointment_id], eta=eta)
    send_appointment_reminder_whatsapp.apply_async(args=[appointment_id], eta=eta)
    return str(async_result.id)


@celery_app.task(name="notifications.reminders.send_appointment_reminder_whatsapp")
def send_appointment_reminder_whatsapp(appointment_id: int) -> dict:
    from services.module_service import send_whatsapp

    db = SessionLocal()
    try:
        appt = db.get(Appointment, appointment_id)
        if appt is None:
            return {"status": "missing", "appointment_id": appointment_id}
        patient = db.get(PatientProfile, appt.patient_id)
        phone = patient.user.phone if patient and patient.user else ""
        msg = f"MediBook WhatsApp reminder: appointment #{appointment_id} at {appt.scheduled_at}"
        if phone:
            send_whatsapp(phone, msg)
        return {"status": "sent", "appointment_id": appointment_id, "channel": "whatsapp", "to": phone}
    finally:
        db.close()
