"""Prescription PDF retrieval."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from utils.exceptions import ForbiddenError, NotFoundError
from models.doctor import DoctorProfile
from models.medical_record import MedicalRecord
from models.patient import PatientProfile
from models.prescription import Prescription
from models.user import User, UserRole
from reports.pdf_service import build_prescription_pdf


def get_prescription_pdf(db: Session, user: User, prescription_id: int) -> bytes:
    rx = db.get(Prescription, prescription_id)
    if rx is None:
        raise NotFoundError("Prescription not found")
    rec = db.scalar(
        select(MedicalRecord).options(joinedload(MedicalRecord.prescriptions)).where(MedicalRecord.id == rx.medical_record_id)
    )
    if rec is None:
        raise NotFoundError("Medical record not found")

    role = user.role.value if isinstance(user.role, UserRole) else str(user.role)
    if role == "patient":
        patient = db.scalar(select(PatientProfile).where(PatientProfile.user_id == user.id))
        if not patient or rec.patient_id != patient.id:
            raise ForbiddenError("Not your prescription")
    elif role == "doctor":
        doctor = db.scalar(select(DoctorProfile).where(DoctorProfile.user_id == user.id))
        if not doctor or rec.doctor_id != doctor.id:
            raise ForbiddenError("Not your prescription")
    elif role != "admin":
        raise ForbiddenError("Insufficient permissions")

    patient = db.scalar(
        select(PatientProfile).options(joinedload(PatientProfile.user)).where(PatientProfile.id == rec.patient_id)
    )
    doctor = db.scalar(
        select(DoctorProfile).options(joinedload(DoctorProfile.user)).where(DoctorProfile.id == rec.doctor_id)
    )
    patient_name = patient.user.full_name if patient and patient.user else "Patient"
    doctor_name = doctor.user.full_name if doctor and doctor.user else "Doctor"

    return build_prescription_pdf(
        patient_name=patient_name,
        doctor_name=doctor_name,
        medicines=rx.medicines or [],
        instructions=rx.instructions or "",
        diagnosis=rec.diagnosis or "",
    )
