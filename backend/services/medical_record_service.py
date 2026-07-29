"""Medical records + prescriptions."""
from __future__ import annotations

from datetime import date
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from utils.exceptions import ForbiddenError, NotFoundError, ValidationAppError
from models.appointment import Appointment, AppointmentStatus
from models.doctor import DoctorProfile
from models.medical_record import MedicalRecord
from models.patient import PatientProfile
from models.prescription import Prescription
from models.user import User, UserRole
from schemas.medical_record import MedicalRecordCreate, PrescriptionCreate
from services.audit_service import write_audit


def record_to_dict(rec: MedicalRecord) -> dict:
    patient_name = None
    doctor_name = None
    # lazy optional loads
    return {
        "id": rec.id,
        "appointment_id": rec.appointment_id,
        "patient_id": rec.patient_id,
        "doctor_id": rec.doctor_id,
        "diagnosis": rec.diagnosis,
        "symptoms": rec.symptoms,
        "notes": rec.notes,
        "created_at": rec.created_at,
        "prescriptions": [
            {
                "id": p.id,
                "medical_record_id": p.medical_record_id,
                "medicines": p.medicines or [],
                "instructions": p.instructions,
                "valid_until": p.valid_until,
                "created_at": p.created_at,
            }
            for p in (rec.prescriptions or [])
        ],
        "patient_name": patient_name,
        "doctor_name": doctor_name,
    }


def _enrich(db: Session, rec: MedicalRecord) -> dict:
    data = record_to_dict(rec)
    patient = db.get(PatientProfile, rec.patient_id)
    doctor = db.get(DoctorProfile, rec.doctor_id)
    if patient and patient.user:
        data["patient_name"] = patient.user.full_name
    elif patient:
        db.refresh(patient)
        from sqlalchemy.orm import joinedload as jl

        patient = db.scalar(
            select(PatientProfile).options(jl(PatientProfile.user)).where(PatientProfile.id == rec.patient_id)
        )
        if patient and patient.user:
            data["patient_name"] = patient.user.full_name
    if doctor:
        doctor = db.scalar(
            select(DoctorProfile).options(joinedload(DoctorProfile.user)).where(DoctorProfile.id == rec.doctor_id)
        )
        if doctor and doctor.user:
            data["doctor_name"] = doctor.user.full_name
    return data


def create_record(db: Session, user: User, payload: MedicalRecordCreate) -> dict:
    doctor = db.scalar(select(DoctorProfile).where(DoctorProfile.user_id == user.id))
    if doctor is None:
        raise ForbiddenError("Doctor profile required")
    appt = db.get(Appointment, payload.appointment_id)
    if appt is None:
        raise NotFoundError("Appointment not found")
    if appt.doctor_id != doctor.id:
        raise ForbiddenError("Not your appointment")
    if appt.status not in {AppointmentStatus.approved, AppointmentStatus.completed, AppointmentStatus.rescheduled}:
        raise ValidationAppError("Appointment must be approved/completed to add records")

    rec = MedicalRecord(
        appointment_id=appt.id,
        patient_id=appt.patient_id,
        doctor_id=doctor.id,
        diagnosis=payload.diagnosis,
        symptoms=payload.symptoms,
        notes=payload.notes,
    )
    db.add(rec)
    write_audit(
        db,
        actor_user_id=user.id,
        action="medical_record.create",
        entity_type="medical_record",
        entity_id=None,
    )
    db.commit()
    db.refresh(rec)
    rec = db.scalar(
        select(MedicalRecord)
        .options(joinedload(MedicalRecord.prescriptions))
        .where(MedicalRecord.id == rec.id)
    )
    assert rec is not None
    return _enrich(db, rec)


def list_records(db: Session, user: User) -> list[dict]:
    role = user.role.value if isinstance(user.role, UserRole) else str(user.role)
    q = select(MedicalRecord).options(joinedload(MedicalRecord.prescriptions))
    if role == "patient":
        patient = db.scalar(select(PatientProfile).where(PatientProfile.user_id == user.id))
        if patient is None:
            return []
        q = q.where(MedicalRecord.patient_id == patient.id)
    elif role == "doctor":
        doctor = db.scalar(select(DoctorProfile).where(DoctorProfile.user_id == user.id))
        if doctor is None:
            return []
        q = q.where(MedicalRecord.doctor_id == doctor.id)
    q = q.order_by(MedicalRecord.created_at.desc())
    return [_enrich(db, r) for r in db.scalars(q).unique().all()]


def get_record(db: Session, user: User, record_id: int) -> dict:
    rec = db.scalar(
        select(MedicalRecord)
        .options(joinedload(MedicalRecord.prescriptions))
        .where(MedicalRecord.id == record_id)
    )
    if rec is None:
        raise NotFoundError("Medical record not found")
    role = user.role.value if isinstance(user.role, UserRole) else str(user.role)
    if role == "patient":
        patient = db.scalar(select(PatientProfile).where(PatientProfile.user_id == user.id))
        if not patient or rec.patient_id != patient.id:
            raise ForbiddenError("Not your record")
    elif role == "doctor":
        doctor = db.scalar(select(DoctorProfile).where(DoctorProfile.user_id == user.id))
        if not doctor or rec.doctor_id != doctor.id:
            raise ForbiddenError("Not your record")
    return _enrich(db, rec)


def add_prescription(db: Session, user: User, record_id: int, payload: PrescriptionCreate) -> dict:
    doctor = db.scalar(select(DoctorProfile).where(DoctorProfile.user_id == user.id))
    if doctor is None:
        raise ForbiddenError("Doctor profile required")
    rec = db.scalar(
        select(MedicalRecord)
        .options(joinedload(MedicalRecord.prescriptions))
        .where(MedicalRecord.id == record_id)
    )
    if rec is None:
        raise NotFoundError("Medical record not found")
    if rec.doctor_id != doctor.id:
        raise ForbiddenError("Not your record")

    valid_until: Optional[date] = None
    if payload.valid_until:
        valid_until = payload.valid_until.date() if hasattr(payload.valid_until, "date") else payload.valid_until

    meds = payload.medicines or []
    primary = meds[0] if meds else {}
    rx = Prescription(
        medical_record_id=rec.id,
        appointment_id=rec.appointment_id,
        doctor_id=rec.doctor_id,
        patient_id=rec.patient_id,
        medicine=primary.get("name") or primary.get("medicine"),
        dosage=primary.get("dose") or primary.get("dosage"),
        medicines=meds,
        instructions=payload.instructions,
        valid_until=valid_until,
    )
    db.add(rx)
    write_audit(
        db,
        actor_user_id=user.id,
        action="prescription.create",
        entity_type="prescription",
        entity_id=None,
    )
    db.commit()
    return get_record(db, user, record_id)
