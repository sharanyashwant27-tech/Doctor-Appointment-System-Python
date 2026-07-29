"""Appointment booking and status workflow with conflict checks."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session, joinedload

from utils.config import settings
from utils.exceptions import ConflictError, ForbiddenError, NotFoundError, ValidationAppError
from models.appointment import Appointment, AppointmentStatus, PaymentStatusOnAppointment
from models.doctor import DoctorProfile
from models.patient import PatientProfile
from models.user import User, UserRole
from schemas.appointment import AppointmentCancel, AppointmentCreate, AppointmentReschedule
from services.audit_service import write_audit
from notifications.notification_service import create_notification


ACTIVE_STATUSES = {
    AppointmentStatus.pending,
    AppointmentStatus.approved,
    AppointmentStatus.confirmed,
    AppointmentStatus.rescheduled,
}


def _aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def appointment_to_dict(appt: Appointment) -> dict:
    patient_name = None
    doctor_name = None
    specialty = None
    if appt.patient and appt.patient.user:
        patient_name = appt.patient.user.full_name
    if appt.doctor:
        specialty = appt.doctor.specialty
        if appt.doctor.user:
            doctor_name = appt.doctor.user.full_name
    return {
        "id": appt.id,
        "patient_id": appt.patient_id,
        "doctor_id": appt.doctor_id,
        "scheduled_at": appt.scheduled_at,
        "appointment_date": appt.appointment_date or (appt.scheduled_at.date() if appt.scheduled_at else None),
        "appointment_time": appt.appointment_time
        or (appt.scheduled_at.timetz().replace(tzinfo=None) if appt.scheduled_at else None),
        "duration_minutes": appt.duration_minutes,
        "status": appt.status,
        "payment_status": appt.payment_status,
        "reason": appt.reason,
        "notes": appt.notes,
        "cancelled_by": appt.cancelled_by,
        "cancel_reason": appt.cancel_reason,
        "consultation_mode": appt.consultation_mode,
        "meeting_url": appt.meeting_url,
        "qr_token": appt.qr_token,
        "token_number": appt.token_number,
        "checked_in_at": appt.checked_in_at,
        "created_at": appt.created_at,
        "patient_name": patient_name,
        "doctor_name": doctor_name,
        "specialty": specialty,
    }


def _load_query():
    return select(Appointment).options(
        joinedload(Appointment.patient).joinedload(PatientProfile.user),
        joinedload(Appointment.doctor).joinedload(DoctorProfile.user),
    )


def get_appointment(db: Session, appointment_id: int) -> Appointment:
    appt = db.scalar(_load_query().where(Appointment.id == appointment_id))
    if appt is None:
        raise NotFoundError("Appointment not found")
    return appt


def _has_conflict(
    db: Session,
    doctor_id: int,
    scheduled_at: datetime,
    duration_minutes: int,
    exclude_id: Optional[int] = None,
) -> bool:
    start = _aware(scheduled_at)
    end = start + timedelta(minutes=duration_minutes)
    q = select(Appointment).where(
        Appointment.doctor_id == doctor_id,
        Appointment.status.in_(list(ACTIVE_STATUSES)),
    )
    if exclude_id:
        q = q.where(Appointment.id != exclude_id)
    for other in db.scalars(q).all():
        o_start = _aware(other.scheduled_at)
        o_end = o_start + timedelta(minutes=other.duration_minutes)
        if start < o_end and end > o_start:
            return True
    return False


def book(db: Session, user: User, payload: AppointmentCreate) -> Appointment:
    patient = db.scalar(select(PatientProfile).where(PatientProfile.user_id == user.id))
    if patient is None:
        raise NotFoundError("Patient profile required")
    doctor = db.get(DoctorProfile, payload.doctor_id)
    if doctor is None:
        raise NotFoundError("Doctor not found")
    scheduled = _aware(payload.scheduled_at)
    if scheduled < datetime.now(timezone.utc):
        raise ValidationAppError("Cannot book in the past")
    if _has_conflict(db, doctor.id, scheduled, payload.duration_minutes):
        raise ConflictError("Doctor already has an appointment in this time slot")

    import secrets

    local_dt = scheduled.astimezone(timezone.utc)
    token_number = (
        db.scalar(
            select(func.count())
            .select_from(Appointment)
            .where(
                Appointment.doctor_id == doctor.id,
                Appointment.appointment_date == local_dt.date(),
            )
        )
        or 0
    ) + 1
    qr_token = secrets.token_urlsafe(16)
    consultation_mode = getattr(payload, "consultation_mode", None) or "in_person"
    meeting_url = f"https://meet.medibook.local/{qr_token}" if consultation_mode == "online" else None

    appt = Appointment(
        patient_id=patient.id,
        doctor_id=doctor.id,
        scheduled_at=scheduled,
        appointment_date=local_dt.date(),
        appointment_time=local_dt.time().replace(tzinfo=None),
        duration_minutes=payload.duration_minutes,
        status=AppointmentStatus.pending,
        payment_status=PaymentStatusOnAppointment.unpaid,
        reason=payload.reason,
        consultation_mode=consultation_mode,
        meeting_url=meeting_url,
        qr_token=qr_token,
        token_number=token_number,
    )
    db.add(appt)
    db.flush()

    create_notification(
        db,
        user_id=doctor.user_id,
        title="New appointment request",
        message=f"Patient requested an appointment at {scheduled.isoformat()}",
        type="appointment",
        meta={"appointment_id": appt.id},
    )
    write_audit(
        db,
        actor_user_id=user.id,
        action="appointment.book",
        entity_type="appointment",
        entity_id=str(appt.id),
    )
    db.commit()

    try:
        from notifications.reminders import schedule_appointment_reminder

        eta = scheduled - timedelta(hours=settings.REMINDER_HOURS_BEFORE)
        if eta > datetime.now(timezone.utc):
            schedule_appointment_reminder(appt.id, eta=eta)
        else:
            schedule_appointment_reminder(appt.id)
    except Exception:  # noqa: BLE001
        pass

    return get_appointment(db, appt.id)


def list_appointments(
    db: Session,
    user: User,
    *,
    status: Optional[AppointmentStatus] = None,
    skip: int = 0,
    limit: int = 100,
) -> list[Appointment]:
    role = user.role.value if isinstance(user.role, UserRole) else str(user.role)
    q = _load_query()
    if role == "patient":
        patient = db.scalar(select(PatientProfile).where(PatientProfile.user_id == user.id))
        if patient is None:
            return []
        q = q.where(Appointment.patient_id == patient.id)
    elif role == "doctor":
        doctor = db.scalar(select(DoctorProfile).where(DoctorProfile.user_id == user.id))
        if doctor is None:
            return []
        q = q.where(Appointment.doctor_id == doctor.id)
    # admin sees all
    if status:
        q = q.where(Appointment.status == status)
    q = q.order_by(Appointment.scheduled_at.desc()).offset(skip).limit(limit)
    return list(db.scalars(q).unique().all())


def _require_doctor_owner(db: Session, user: User, appt: Appointment) -> DoctorProfile:
    doctor = db.scalar(select(DoctorProfile).where(DoctorProfile.user_id == user.id))
    if doctor is None or appt.doctor_id != doctor.id:
        raise ForbiddenError("Not your appointment")
    return doctor


def _require_patient_owner(db: Session, user: User, appt: Appointment) -> PatientProfile:
    patient = db.scalar(select(PatientProfile).where(PatientProfile.user_id == user.id))
    if patient is None or appt.patient_id != patient.id:
        raise ForbiddenError("Not your appointment")
    return patient


def approve(db: Session, user: User, appointment_id: int) -> Appointment:
    appt = get_appointment(db, appointment_id)
    _require_doctor_owner(db, user, appt)
    if appt.status != AppointmentStatus.pending:
        raise ValidationAppError("Only pending appointments can be approved")
    appt.status = AppointmentStatus.approved
    if appt.patient and appt.patient.user_id:
        create_notification(
            db,
            user_id=appt.patient.user_id,
            title="Appointment approved",
            message=f"Your appointment #{appt.id} was approved",
            type="appointment",
            meta={"appointment_id": appt.id},
        )
    write_audit(db, actor_user_id=user.id, action="appointment.approve", entity_type="appointment", entity_id=str(appt.id))
    db.commit()
    return get_appointment(db, appointment_id)


def reject(db: Session, user: User, appointment_id: int, notes: Optional[str] = None) -> Appointment:
    appt = get_appointment(db, appointment_id)
    _require_doctor_owner(db, user, appt)
    if appt.status != AppointmentStatus.pending:
        raise ValidationAppError("Only pending appointments can be rejected")
    appt.status = AppointmentStatus.rejected
    if notes:
        appt.notes = notes
    if appt.patient and appt.patient.user_id:
        create_notification(
            db,
            user_id=appt.patient.user_id,
            title="Appointment rejected",
            message=f"Your appointment #{appt.id} was rejected",
            type="appointment",
            meta={"appointment_id": appt.id},
        )
    write_audit(db, actor_user_id=user.id, action="appointment.reject", entity_type="appointment", entity_id=str(appt.id))
    db.commit()
    return get_appointment(db, appointment_id)


def cancel(db: Session, user: User, appointment_id: int, payload: AppointmentCancel) -> Appointment:
    appt = get_appointment(db, appointment_id)
    role = user.role.value if isinstance(user.role, UserRole) else str(user.role)
    if role == "patient":
        _require_patient_owner(db, user, appt)
    elif role == "doctor":
        _require_doctor_owner(db, user, appt)
    elif role != "admin":
        raise ForbiddenError("Cannot cancel")
    if appt.status in {AppointmentStatus.cancelled, AppointmentStatus.completed, AppointmentStatus.rejected}:
        raise ValidationAppError("Appointment cannot be cancelled")
    appt.status = AppointmentStatus.cancelled
    appt.cancelled_by = role
    appt.cancel_reason = payload.cancel_reason
    write_audit(db, actor_user_id=user.id, action="appointment.cancel", entity_type="appointment", entity_id=str(appt.id))
    db.commit()
    return get_appointment(db, appointment_id)


def reschedule(db: Session, user: User, appointment_id: int, payload: AppointmentReschedule) -> Appointment:
    appt = get_appointment(db, appointment_id)
    role = user.role.value if isinstance(user.role, UserRole) else str(user.role)
    if role == "patient":
        _require_patient_owner(db, user, appt)
    elif role == "doctor":
        _require_doctor_owner(db, user, appt)
    else:
        raise ForbiddenError("Cannot reschedule")
    if appt.status in {AppointmentStatus.cancelled, AppointmentStatus.completed, AppointmentStatus.rejected}:
        raise ValidationAppError("Appointment cannot be rescheduled")
    scheduled = _aware(payload.scheduled_at)
    if scheduled < datetime.now(timezone.utc):
        raise ValidationAppError("Cannot reschedule to the past")
    if _has_conflict(db, appt.doctor_id, scheduled, appt.duration_minutes, exclude_id=appt.id):
        raise ConflictError("Doctor already has an appointment in this time slot")
    appt.scheduled_at = scheduled
    appt.appointment_date = scheduled.astimezone(timezone.utc).date()
    appt.appointment_time = scheduled.astimezone(timezone.utc).time().replace(tzinfo=None)
    appt.status = AppointmentStatus.rescheduled
    write_audit(
        db,
        actor_user_id=user.id,
        action="appointment.reschedule",
        entity_type="appointment",
        entity_id=str(appt.id),
        details={"scheduled_at": scheduled.isoformat()},
    )
    db.commit()
    return get_appointment(db, appointment_id)


def complete(db: Session, user: User, appointment_id: int, notes: Optional[str] = None) -> Appointment:
    appt = get_appointment(db, appointment_id)
    _require_doctor_owner(db, user, appt)
    if appt.status not in {AppointmentStatus.approved, AppointmentStatus.rescheduled}:
        raise ValidationAppError("Only approved/rescheduled appointments can be completed")
    appt.status = AppointmentStatus.completed
    if notes:
        appt.notes = notes
    write_audit(db, actor_user_id=user.id, action="appointment.complete", entity_type="appointment", entity_id=str(appt.id))
    db.commit()
    return get_appointment(db, appointment_id)
