"""Doctor profile + availability service."""
from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from utils.exceptions import ForbiddenError, NotFoundError, ValidationAppError
from models.availability import Availability
from models.doctor import DoctorProfile
from models.user import User
from schemas.doctor import AvailabilityCreate, AvailabilityUpdate, DoctorProfileUpdate
from services.audit_service import write_audit


def _enrich(profile: DoctorProfile) -> DoctorProfile:
    return profile


def doctor_to_dict(profile: DoctorProfile) -> dict:
    u = profile.user
    return {
        "id": profile.id,
        "user_id": profile.user_id,
        "specialty": profile.specialty,
        "qualification": profile.qualification,
        "experience_years": profile.experience_years,
        "bio": profile.bio,
        "consultation_fee": profile.consultation_fee,
        "clinic_address": profile.clinic_address,
        "city": profile.city,
        "rating_avg": profile.rating_avg,
        "is_verified": profile.is_verified,
        "full_name": u.full_name if u else None,
        "email": u.email if u else None,
        "phone": u.phone if u else None,
    }


def get_profile_for_user(db: Session, user: User) -> DoctorProfile:
    profile = db.scalar(
        select(DoctorProfile).options(joinedload(DoctorProfile.user)).where(DoctorProfile.user_id == user.id)
    )
    if profile is None:
        raise NotFoundError("Doctor profile not found")
    return profile


def list_doctors(
    db: Session,
    *,
    specialty: Optional[str] = None,
    city: Optional[str] = None,
    q: Optional[str] = None,
    verified_only: bool = False,
    skip: int = 0,
    limit: int = 50,
) -> list[DoctorProfile]:
    query = select(DoctorProfile).options(joinedload(DoctorProfile.user)).join(User)
    if specialty:
        query = query.where(DoctorProfile.specialty.ilike(f"%{specialty}%"))
    if city:
        query = query.where(DoctorProfile.city.ilike(f"%{city}%"))
    if q:
        query = query.where(
            (User.full_name.ilike(f"%{q}%"))
            | (DoctorProfile.specialty.ilike(f"%{q}%"))
            | (DoctorProfile.city.ilike(f"%{q}%"))
        )
    if verified_only:
        query = query.where(DoctorProfile.is_verified.is_(True))
    return list(db.scalars(query.offset(skip).limit(limit)).unique().all())


def get_doctor(db: Session, doctor_id: int) -> DoctorProfile:
    profile = db.scalar(
        select(DoctorProfile).options(joinedload(DoctorProfile.user)).where(DoctorProfile.id == doctor_id)
    )
    if profile is None:
        raise NotFoundError("Doctor not found")
    return profile


def update_my_profile(db: Session, user: User, payload: DoctorProfileUpdate) -> DoctorProfile:
    profile = get_profile_for_user(db, user)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(profile, k, v)
    write_audit(
        db,
        actor_user_id=user.id,
        action="doctor.profile_update",
        entity_type="doctor_profile",
        entity_id=str(profile.id),
    )
    db.commit()
    db.refresh(profile)
    return get_doctor(db, profile.id)


def list_availability(db: Session, doctor_id: int) -> list[Availability]:
    get_doctor(db, doctor_id)
    return list(
        db.scalars(
            select(Availability)
            .where(Availability.doctor_id == doctor_id)
            .order_by(Availability.day_of_week, Availability.start_time)
        ).all()
    )


def create_availability(db: Session, user: User, payload: AvailabilityCreate) -> Availability:
    profile = get_profile_for_user(db, user)
    if payload.start_time >= payload.end_time:
        raise ValidationAppError("start_time must be before end_time")
    if payload.day_of_week is None and payload.specific_date is None:
        raise ValidationAppError("day_of_week or specific_date required")
    row = Availability(doctor_id=profile.id, **payload.model_dump())
    db.add(row)
    write_audit(
        db,
        actor_user_id=user.id,
        action="doctor.availability_create",
        entity_type="availability",
        entity_id=None,
    )
    db.commit()
    db.refresh(row)
    return row


def update_availability(db: Session, user: User, availability_id: int, payload: AvailabilityUpdate) -> Availability:
    profile = get_profile_for_user(db, user)
    row = db.get(Availability, availability_id)
    if row is None or row.doctor_id != profile.id:
        raise NotFoundError("Availability not found")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(row, k, v)
    if row.start_time >= row.end_time:
        raise ValidationAppError("start_time must be before end_time")
    db.commit()
    db.refresh(row)
    return row


def delete_availability(db: Session, user: User, availability_id: int) -> None:
    profile = get_profile_for_user(db, user)
    row = db.get(Availability, availability_id)
    if row is None or row.doctor_id != profile.id:
        raise NotFoundError("Availability not found")
    db.delete(row)
    db.commit()


def verify_doctor(db: Session, doctor_id: int, is_verified: bool, actor_id: int) -> DoctorProfile:
    profile = get_doctor(db, doctor_id)
    profile.is_verified = is_verified
    write_audit(
        db,
        actor_user_id=actor_id,
        action="doctor.verify" if is_verified else "doctor.unverify",
        entity_type="doctor_profile",
        entity_id=str(profile.id),
    )
    db.commit()
    return get_doctor(db, doctor_id)


def ensure_doctor_owns(profile: DoctorProfile, user: User) -> None:
    if profile.user_id != user.id:
        raise ForbiddenError("Not your doctor profile")
