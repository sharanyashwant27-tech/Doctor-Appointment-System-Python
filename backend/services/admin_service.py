"""Admin analytics."""
from __future__ import annotations

from collections import defaultdict
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from models.appointment import Appointment, AppointmentStatus
from models.doctor import DoctorProfile
from models.patient import PatientProfile
from models.payment import Payment, PaymentStatus
from models.user import User, UserRole


def analytics(db: Session) -> dict[str, Any]:
    users_total = db.scalar(select(func.count()).select_from(User)) or 0
    doctors_total = db.scalar(select(func.count()).select_from(DoctorProfile)) or 0
    patients_total = db.scalar(select(func.count()).select_from(User).where(User.role == UserRole.patient)) or 0
    appointments_total = db.scalar(select(func.count()).select_from(Appointment)) or 0

    status_rows = db.execute(select(Appointment.status, func.count()).group_by(Appointment.status)).all()
    appointments_by_status = {str(s.value if hasattr(s, "value") else s): c for s, c in status_rows}

    payments_success = (
        db.scalar(select(func.count()).select_from(Payment).where(Payment.status == PaymentStatus.success)) or 0
    )
    payments_total = (
        db.scalar(
            select(func.coalesce(func.sum(Payment.amount), 0.0)).where(Payment.status == PaymentStatus.success)
        )
        or 0.0
    )

    month_map: dict[str, float] = defaultdict(float)
    for paid_at, amount in db.execute(
        select(Payment.paid_at, Payment.amount).where(Payment.status == PaymentStatus.success)
    ).all():
        if paid_at:
            month_map[paid_at.strftime("%Y-%m")] += float(amount)
    revenue_by_month = [{"month": k, "revenue": v} for k, v in sorted(month_map.items())]

    specialty_rows = db.execute(
        select(DoctorProfile.specialty, func.count(Appointment.id))
        .outerjoin(Appointment, Appointment.doctor_id == DoctorProfile.id)
        .group_by(DoctorProfile.specialty)
    ).all()
    appointments_by_specialty = [{"specialty": s, "count": c} for s, c in specialty_rows]

    # Peak hours
    hour_counts: dict[int, int] = defaultdict(int)
    for scheduled_at in db.scalars(select(Appointment.scheduled_at)).all():
        if scheduled_at:
            hour_counts[scheduled_at.hour] += 1
    peak_hours = [{"hour": h, "count": hour_counts[h]} for h in sorted(hour_counts)]

    # Doctor performance
    doctor_performance = []
    doctors = db.scalars(select(DoctorProfile).options(joinedload(DoctorProfile.user))).unique().all()
    for doc in doctors:
        completed = (
            db.scalar(
                select(func.count())
                .select_from(Appointment)
                .where(Appointment.doctor_id == doc.id, Appointment.status == AppointmentStatus.completed)
            )
            or 0
        )
        cancelled = (
            db.scalar(
                select(func.count())
                .select_from(Appointment)
                .where(Appointment.doctor_id == doc.id, Appointment.status == AppointmentStatus.cancelled)
            )
            or 0
        )
        appt_ids = select(Appointment.id).where(Appointment.doctor_id == doc.id)
        revenue = (
            db.scalar(
                select(func.coalesce(func.sum(Payment.amount), 0.0)).where(
                    Payment.appointment_id.in_(appt_ids), Payment.status == PaymentStatus.success
                )
            )
            or 0.0
        )
        doctor_performance.append(
            {
                "doctor_id": doc.id,
                "doctor_name": doc.user.full_name if doc.user else f"Doctor #{doc.id}",
                "completed": completed,
                "cancelled": cancelled,
                "revenue": float(revenue),
            }
        )

    # Patient visits
    patient_visits = []
    visit_rows = db.execute(
        select(Appointment.patient_id, func.count()).group_by(Appointment.patient_id)
    ).all()
    for pid, cnt in visit_rows:
        patient = db.scalar(
            select(PatientProfile).options(joinedload(PatientProfile.user)).where(PatientProfile.id == pid)
        )
        patient_visits.append(
            {
                "patient_id": pid,
                "patient_name": patient.user.full_name if patient and patient.user else f"Patient #{pid}",
                "visit_count": cnt,
            }
        )

    cancelled_count = appointments_by_status.get("cancelled", 0)
    department_performance = [{"department": s["specialty"], "count": s["count"]} for s in appointments_by_specialty]

    # Dashboard extras
    from datetime import datetime, timezone

    from models.audit_log import AuditLog

    today = datetime.now(timezone.utc).date()
    todays_appointments = 0
    for scheduled_at in db.scalars(select(Appointment.scheduled_at)).all():
        if scheduled_at is None:
            continue
        d = scheduled_at.date() if hasattr(scheduled_at, "date") else scheduled_at
        if d == today:
            todays_appointments += 1

    pending_payments = (
        db.scalar(select(func.count()).select_from(Payment).where(Payment.status == PaymentStatus.pending)) or 0
    )

    recent_activities = []
    for row in db.scalars(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(12)).all():
        recent_activities.append(
            {
                "id": row.id,
                "action": row.action,
                "entity_type": row.entity_type,
                "entity_id": row.entity_id,
                "actor_user_id": row.actor_user_id,
                "created_at": row.created_at.isoformat() if row.created_at else None,
            }
        )

    # Enrich doctor performance with rating
    for item in doctor_performance:
        doc = db.get(DoctorProfile, item["doctor_id"])
        item["rating"] = float(doc.rating_avg) if doc else 0.0

    return {
        "users_total": users_total,
        "doctors_total": doctors_total,
        "patients_total": patients_total,
        "appointments_total": appointments_total,
        "todays_appointments": todays_appointments,
        "pending_payments": int(pending_payments),
        "appointments_by_status": appointments_by_status,
        "payments_total": float(payments_total),
        "payments_success_count": payments_success,
        "revenue_by_month": revenue_by_month,
        "appointments_by_specialty": appointments_by_specialty,
        "peak_hours": peak_hours,
        "doctor_performance": doctor_performance,
        "patient_visits": patient_visits,
        "cancelled_count": cancelled_count,
        "department_performance": department_performance,
        "recent_activities": recent_activities,
    }
