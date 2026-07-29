"""Patient profile service."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from utils.exceptions import ForbiddenError, NotFoundError
from models.patient import PatientProfile
from models.user import User, UserRole
from schemas.patient import PatientProfileUpdate
from services.audit_service import write_audit


def patient_to_dict(profile: PatientProfile) -> dict:
    u = profile.user
    return {
        "id": profile.id,
        "user_id": profile.user_id,
        "date_of_birth": profile.date_of_birth,
        "gender": profile.gender,
        "blood_group": profile.blood_group,
        "address": profile.address,
        "emergency_contact": profile.emergency_contact,
        "full_name": u.full_name if u else None,
        "email": u.email if u else None,
        "phone": u.phone if u else None,
    }


def get_profile_for_user(db: Session, user: User) -> PatientProfile:
    profile = db.scalar(
        select(PatientProfile).options(joinedload(PatientProfile.user)).where(PatientProfile.user_id == user.id)
    )
    if profile is None:
        raise NotFoundError("Patient profile not found")
    return profile


def get_patient(db: Session, patient_id: int, requester: User) -> PatientProfile:
    profile = db.scalar(
        select(PatientProfile).options(joinedload(PatientProfile.user)).where(PatientProfile.id == patient_id)
    )
    if profile is None:
        raise NotFoundError("Patient not found")
    role = requester.role.value if isinstance(requester.role, UserRole) else str(requester.role)
    if role == "patient" and profile.user_id != requester.id:
        raise ForbiddenError("Cannot view other patient profiles")
    return profile


def update_my_profile(db: Session, user: User, payload: PatientProfileUpdate) -> PatientProfile:
    profile = get_profile_for_user(db, user)
    data = payload.model_dump(exclude_unset=True)
    user_fields = {}
    if "full_name" in data:
        user_fields["full_name"] = data.pop("full_name")
    if "phone" in data:
        user_fields["phone"] = data.pop("phone")
    for k, v in data.items():
        setattr(profile, k, v)
    if user_fields and profile.user:
        for k, v in user_fields.items():
            setattr(profile.user, k, v)
    write_audit(
        db,
        actor_user_id=user.id,
        action="patient.profile_update",
        entity_type="patient_profile",
        entity_id=str(profile.id),
    )
    db.commit()
    return get_profile_for_user(db, user)
