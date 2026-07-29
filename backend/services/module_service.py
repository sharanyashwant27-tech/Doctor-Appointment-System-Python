"""Waiting list, org CRUD, clinical extras, WhatsApp."""
from __future__ import annotations

import os
import secrets
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from utils.config import settings
from utils.exceptions import ForbiddenError, NotFoundError, ValidationAppError
from middleware.logging import get_logger
from models.appointment import Appointment, AppointmentStatus
from models.clinical import Allergy, LabReport, Vaccination, WaitingListEntry, WaitingListStatus
from models.doctor import DoctorProfile
from models.org import Branch, Department, Permission
from models.patient import PatientProfile
from models.user import User, UserRole

logger = get_logger(__name__)
UPLOAD_ROOT = Path(__file__).resolve().parents[2] / "uploads" / "lab_reports"


def join_waiting_list(db: Session, user: User, doctor_id: int, preferred_date: Optional[date], notes: Optional[str]) -> WaitingListEntry:
    patient = db.scalar(select(PatientProfile).where(PatientProfile.user_id == user.id))
    if not patient:
        raise ForbiddenError("Patient profile required")
    if not db.get(DoctorProfile, doctor_id):
        raise NotFoundError("Doctor not found")
    entry = WaitingListEntry(
        patient_id=patient.id,
        doctor_id=doctor_id,
        preferred_date=preferred_date,
        notes=notes,
        status=WaitingListStatus.waiting,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def list_waiting(db: Session, user: User, doctor_id: Optional[int] = None) -> list[WaitingListEntry]:
    role = user.role.value if isinstance(user.role, UserRole) else str(user.role)
    q = select(WaitingListEntry).order_by(WaitingListEntry.created_at.desc())
    if role == "patient":
        patient = db.scalar(select(PatientProfile).where(PatientProfile.user_id == user.id))
        if not patient:
            return []
        q = q.where(WaitingListEntry.patient_id == patient.id)
    elif role == "doctor":
        doctor = db.scalar(select(DoctorProfile).where(DoctorProfile.user_id == user.id))
        if not doctor:
            return []
        q = q.where(WaitingListEntry.doctor_id == doctor.id)
    elif doctor_id:
        q = q.where(WaitingListEntry.doctor_id == doctor_id)
    return list(db.scalars(q).all())


def cancel_waiting(db: Session, user: User, entry_id: int) -> WaitingListEntry:
    entry = db.get(WaitingListEntry, entry_id)
    if not entry:
        raise NotFoundError("Waiting list entry not found")
    patient = db.scalar(select(PatientProfile).where(PatientProfile.user_id == user.id))
    role = user.role.value if isinstance(user.role, UserRole) else str(user.role)
    if role == "patient" and (not patient or entry.patient_id != patient.id):
        raise ForbiddenError("Not your entry")
    entry.status = WaitingListStatus.cancelled
    db.commit()
    db.refresh(entry)
    return entry


def mark_no_show(db: Session, user: User, appointment_id: int) -> Appointment:
    from services.appointment_service import _require_doctor_owner, get_appointment

    appt = get_appointment(db, appointment_id)
    role = user.role.value if isinstance(user.role, UserRole) else str(user.role)
    if role == "doctor":
        _require_doctor_owner(db, user, appt)
    elif role != "admin":
        raise ForbiddenError("Doctor or admin only")
    if appt.status not in {AppointmentStatus.approved, AppointmentStatus.confirmed, AppointmentStatus.pending}:
        raise ValidationAppError("Cannot mark no-show for this status")
    appt.status = AppointmentStatus.no_show
    db.commit()
    return get_appointment(db, appointment_id)


def check_in(db: Session, user: User, qr_token: str) -> Appointment:
    from services.appointment_service import get_appointment

    appt = db.scalar(select(Appointment).where(Appointment.qr_token == qr_token))
    if not appt:
        raise NotFoundError("Invalid QR token")
    appt.checked_in_at = datetime.now(timezone.utc)
    if appt.status == AppointmentStatus.pending:
        appt.status = AppointmentStatus.confirmed
    db.commit()
    return get_appointment(db, appt.id)


def qr_payload(db: Session, user: User, appointment_id: int) -> dict:
    from services.appointment_service import get_appointment

    appt = get_appointment(db, appointment_id)
    return {
        "appointment_id": appt.id,
        "qr_token": appt.qr_token,
        "token_number": appt.token_number,
        "checkin_payload": f"medibook:checkin:{appt.qr_token}",
        "consultation_mode": appt.consultation_mode,
        "meeting_url": appt.meeting_url,
    }


# --- Org ---
def list_departments(db: Session, active_only: bool = True) -> list[Department]:
    q = select(Department).order_by(Department.name)
    if active_only:
        q = q.where(Department.is_active.is_(True))
    return list(db.scalars(q).all())


def create_department(db: Session, name: str, description: Optional[str] = None) -> Department:
    d = Department(name=name, description=description)
    db.add(d)
    db.commit()
    db.refresh(d)
    return d


def list_branches(db: Session, active_only: bool = True) -> list[Branch]:
    q = select(Branch).order_by(Branch.name)
    if active_only:
        q = q.where(Branch.is_active.is_(True))
    return list(db.scalars(q).all())


def create_branch(db: Session, name: str, address: Optional[str] = None, city: Optional[str] = None, phone: Optional[str] = None) -> Branch:
    b = Branch(name=name, address=address, city=city, phone=phone)
    db.add(b)
    db.commit()
    db.refresh(b)
    return b


def list_permissions(db: Session) -> list[Permission]:
    return list(db.scalars(select(Permission).order_by(Permission.role, Permission.code)).all())


# --- Clinical ---
def add_allergy(db: Session, user: User, name: str, severity: Optional[str], notes: Optional[str]) -> Allergy:
    patient = db.scalar(select(PatientProfile).where(PatientProfile.user_id == user.id))
    if not patient:
        raise ForbiddenError("Patient profile required")
    row = Allergy(patient_id=patient.id, name=name, severity=severity, notes=notes)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_allergies(db: Session, user: User, patient_id: Optional[int] = None) -> list[Allergy]:
    pid = patient_id
    if pid is None:
        patient = db.scalar(select(PatientProfile).where(PatientProfile.user_id == user.id))
        pid = patient.id if patient else None
    if pid is None:
        return []
    return list(db.scalars(select(Allergy).where(Allergy.patient_id == pid)).all())


def add_vaccination(db: Session, user: User, vaccine_name: str, dose: Optional[str], administered_on: Optional[date], notes: Optional[str]) -> Vaccination:
    patient = db.scalar(select(PatientProfile).where(PatientProfile.user_id == user.id))
    if not patient:
        raise ForbiddenError("Patient profile required")
    row = Vaccination(patient_id=patient.id, vaccine_name=vaccine_name, dose=dose, administered_on=administered_on, notes=notes)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_vaccinations(db: Session, user: User, patient_id: Optional[int] = None) -> list[Vaccination]:
    pid = patient_id
    if pid is None:
        patient = db.scalar(select(PatientProfile).where(PatientProfile.user_id == user.id))
        pid = patient.id if patient else None
    if pid is None:
        return []
    return list(db.scalars(select(Vaccination).where(Vaccination.patient_id == pid)).all())


def save_lab_report(db: Session, user: User, title: str, filename: str, content: bytes, notes: Optional[str] = None) -> LabReport:
    patient = db.scalar(select(PatientProfile).where(PatientProfile.user_id == user.id))
    if not patient:
        raise ForbiddenError("Patient profile required")
    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    safe = f"{patient.id}_{secrets.token_hex(8)}_{filename.replace(' ', '_')}"
    path = UPLOAD_ROOT / safe
    path.write_bytes(content)
    row = LabReport(patient_id=patient.id, title=title, file_path=str(path), uploaded_by=user.id, notes=notes)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_lab_reports(db: Session, user: User) -> list[LabReport]:
    patient = db.scalar(select(PatientProfile).where(PatientProfile.user_id == user.id))
    if not patient:
        return []
    return list(db.scalars(select(LabReport).where(LabReport.patient_id == patient.id)).all())


def send_whatsapp(phone: str, message: str) -> bool:
    """Twilio WhatsApp or console stub."""
    from_wa = (getattr(settings, "TWILIO_WHATSAPP_FROM", None) or "").strip()
    sid = (settings.TWILIO_ACCOUNT_SID or "").strip()
    token = (settings.TWILIO_AUTH_TOKEN or "").strip()
    if not (sid and token and from_wa and phone):
        logger.info("[whatsapp:console] to=%s message=%s", phone, message)
        return True
    try:
        from twilio.rest import Client

        client = Client(sid, token)
        to = phone if phone.startswith("whatsapp:") else f"whatsapp:{phone}"
        client.messages.create(body=message, from_=from_wa, to=to)
        return True
    except Exception as exc:  # noqa: BLE001
        logger.exception("WhatsApp failed: %s", exc)
        return False
