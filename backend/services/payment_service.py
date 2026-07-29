"""Payment checkout/confirm + invoice PDF."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from utils.config import settings
from utils.exceptions import ForbiddenError, NotFoundError, PaymentError, ValidationAppError
from models.appointment import Appointment, AppointmentStatus, PaymentStatusOnAppointment
from models.doctor import DoctorProfile
from models.patient import PatientProfile
from models.payment import Payment, PaymentStatus
from models.user import User, UserRole
from services.audit_service import write_audit
from notifications.notification_service import create_notification
from services.payment_gateway import get_payment_gateway
from reports.pdf_service import build_invoice_pdf


PAID_APPOINTMENT_STATUSES = {
    AppointmentStatus.approved,
    AppointmentStatus.confirmed,
    AppointmentStatus.completed,
    AppointmentStatus.rescheduled,
}


def payment_to_dict(p: Payment, db: Optional[Session] = None) -> dict:
    patient_name = None
    doctor_name = None
    if db is not None:
        patient = db.scalar(
            select(PatientProfile).options(joinedload(PatientProfile.user)).where(PatientProfile.id == p.patient_id)
        )
        appt = db.get(Appointment, p.appointment_id)
        if patient and patient.user:
            patient_name = patient.user.full_name
        if appt:
            doctor = db.scalar(
                select(DoctorProfile).options(joinedload(DoctorProfile.user)).where(DoctorProfile.id == appt.doctor_id)
            )
            if doctor and doctor.user:
                doctor_name = doctor.user.full_name
    return {
        "id": p.id,
        "appointment_id": p.appointment_id,
        "patient_id": p.patient_id,
        "amount": p.amount,
        "currency": p.currency,
        "status": p.status,
        "gateway": p.gateway,
        "gateway_ref": p.gateway_ref,
        "payment_mode": p.gateway,
        "transaction_id": p.gateway_ref,
        "invoice_number": p.invoice_number,
        "paid_at": p.paid_at,
        "created_at": p.created_at,
        "patient_name": patient_name,
        "doctor_name": doctor_name,
    }


def checkout(db: Session, user: User, appointment_id: int, currency: str = "INR") -> dict:
    patient = db.scalar(select(PatientProfile).where(PatientProfile.user_id == user.id))
    if patient is None:
        raise ForbiddenError("Patient profile required")
    appt = db.get(Appointment, appointment_id)
    if appt is None:
        raise NotFoundError("Appointment not found")
    if appt.patient_id != patient.id:
        raise ForbiddenError("Not your appointment")
    if appt.status not in PAID_APPOINTMENT_STATUSES:
        raise ValidationAppError("Appointment must be approved before payment")

    existing = db.scalar(
        select(Payment).where(
            Payment.appointment_id == appointment_id,
            Payment.status.in_([PaymentStatus.pending, PaymentStatus.success]),
        )
    )
    if existing and existing.status == PaymentStatus.success:
        raise ValidationAppError("Appointment already paid")
    if existing and existing.status == PaymentStatus.pending:
        return payment_to_dict(existing, db)

    doctor = db.get(DoctorProfile, appt.doctor_id)
    amount = float(doctor.consultation_fee if doctor else 0) or 500.0
    gateway = get_payment_gateway()
    intent = gateway.create_payment(amount=amount, currency=currency, meta={"appointment_id": appointment_id})

    payment = Payment(
        appointment_id=appointment_id,
        patient_id=patient.id,
        amount=amount,
        currency=currency,
        status=PaymentStatus.pending,
        gateway=settings.PAYMENT_GATEWAY or "mock",
        gateway_ref=intent.gateway_ref,
    )
    db.add(payment)
    appt.payment_status = PaymentStatusOnAppointment.pending
    write_audit(
        db,
        actor_user_id=user.id,
        action="payment.checkout",
        entity_type="payment",
        entity_id=None,
        details={"amount": amount, "gateway_ref": intent.gateway_ref, "transaction_id": intent.gateway_ref, "payment_mode": settings.PAYMENT_GATEWAY or "mock"},
    )
    db.commit()
    db.refresh(payment)
    return payment_to_dict(payment, db)


def confirm(db: Session, user: User, payment_id: int, force_fail: bool = False) -> dict:
    patient = db.scalar(select(PatientProfile).where(PatientProfile.user_id == user.id))
    payment = db.get(Payment, payment_id)
    if payment is None:
        raise NotFoundError("Payment not found")
    role = user.role.value if isinstance(user.role, UserRole) else str(user.role)
    if role == "patient":
        if patient is None or payment.patient_id != patient.id:
            raise ForbiddenError("Not your payment")
    elif role != "admin":
        raise ForbiddenError("Insufficient permissions")
    if payment.status != PaymentStatus.pending:
        raise ValidationAppError("Payment is not pending")
    if not payment.gateway_ref:
        raise PaymentError("Missing gateway reference")

    gateway = get_payment_gateway()
    result = gateway.confirm(payment.gateway_ref, meta={"force_fail": force_fail})
    if result.status == "success":
        payment.status = PaymentStatus.success
        payment.paid_at = datetime.now(timezone.utc)
        payment.invoice_number = f"INV-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid4().hex[:8].upper()}"
        appt = db.get(Appointment, payment.appointment_id)
        if appt:
            appt.payment_status = PaymentStatusOnAppointment.paid
        create_notification(
            db,
            user_id=user.id,
            title="Payment successful",
            message=f"Payment {payment.invoice_number} confirmed",
            type="payment",
            meta={"payment_id": payment.id},
        )
    else:
        payment.status = PaymentStatus.failed
        appt = db.get(Appointment, payment.appointment_id)
        if appt:
            appt.payment_status = PaymentStatusOnAppointment.failed

    write_audit(
        db,
        actor_user_id=user.id,
        action="payment.confirm",
        entity_type="payment",
        entity_id=str(payment.id),
        details={"status": payment.status.value},
    )
    db.commit()
    db.refresh(payment)
    if payment.status == PaymentStatus.failed:
        raise PaymentError("Payment confirmation failed")
    return payment_to_dict(payment, db)


def list_payments(db: Session, user: User) -> list[dict]:
    role = user.role.value if isinstance(user.role, UserRole) else str(user.role)
    q = select(Payment).order_by(Payment.created_at.desc())
    if role == "patient":
        patient = db.scalar(select(PatientProfile).where(PatientProfile.user_id == user.id))
        if patient is None:
            return []
        q = q.where(Payment.patient_id == patient.id)
    elif role == "doctor":
        doctor = db.scalar(select(DoctorProfile).where(DoctorProfile.user_id == user.id))
        if doctor is None:
            return []
        appt_ids = select(Appointment.id).where(Appointment.doctor_id == doctor.id)
        q = q.where(Payment.appointment_id.in_(appt_ids))
    return [payment_to_dict(p, db) for p in db.scalars(q).all()]


def get_payment(db: Session, user: User, payment_id: int) -> dict:
    payment = db.get(Payment, payment_id)
    if payment is None:
        raise NotFoundError("Payment not found")
    role = user.role.value if isinstance(user.role, UserRole) else str(user.role)
    if role == "patient":
        patient = db.scalar(select(PatientProfile).where(PatientProfile.user_id == user.id))
        if not patient or payment.patient_id != patient.id:
            raise ForbiddenError("Not your payment")
    elif role == "doctor":
        doctor = db.scalar(select(DoctorProfile).where(DoctorProfile.user_id == user.id))
        appt = db.get(Appointment, payment.appointment_id)
        if not doctor or not appt or appt.doctor_id != doctor.id:
            raise ForbiddenError("Not your payment")
    return payment_to_dict(payment, db)


def refund(db: Session, user: User, payment_id: int) -> dict:
    payment = db.get(Payment, payment_id)
    if payment is None:
        raise NotFoundError("Payment not found")
    role = user.role.value if isinstance(user.role, UserRole) else str(user.role)
    if role == "patient":
        patient = db.scalar(select(PatientProfile).where(PatientProfile.user_id == user.id))
        if not patient or payment.patient_id != patient.id:
            raise ForbiddenError("Not your payment")
    elif role != "admin":
        raise ForbiddenError("Admin or patient only")
    if payment.status != PaymentStatus.success:
        raise ValidationAppError("Only successful payments can be refunded")
    if not payment.gateway_ref:
        raise PaymentError("Missing transaction id")

    gateway = get_payment_gateway()
    result = gateway.refund(payment.gateway_ref, amount=payment.amount)
    if result.status != "refunded":
        raise PaymentError("Refund failed")
    payment.status = PaymentStatus.refunded
    appt = db.get(Appointment, payment.appointment_id)
    if appt:
        appt.payment_status = PaymentStatusOnAppointment.refunded
    write_audit(
        db,
        actor_user_id=user.id,
        action="payment.refund",
        entity_type="payment",
        entity_id=str(payment.id),
    )
    db.commit()
    db.refresh(payment)
    return payment_to_dict(payment, db)


def invoice_pdf(db: Session, user: User, payment_id: int) -> bytes:
    data = get_payment(db, user, payment_id)
    payment = db.get(Payment, payment_id)
    assert payment is not None
    if payment.status != PaymentStatus.success:
        raise ValidationAppError("Invoice available only for successful payments")
    return build_invoice_pdf(
        invoice_number=payment.invoice_number or f"PAY-{payment.id}",
        patient_name=data.get("patient_name") or "Patient",
        doctor_name=data.get("doctor_name") or "Doctor",
        amount=payment.amount,
        currency=payment.currency,
        paid_at=payment.paid_at,
        appointment_ref=str(payment.appointment_id),
    )
