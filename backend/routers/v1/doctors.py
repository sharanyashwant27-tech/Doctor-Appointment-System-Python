"""Doctors API."""
from typing import List, Optional

from fastapi import APIRouter, Query

from api.deps import DbSession, DoctorUser
from schemas.doctor import (
    AvailabilityCreate,
    AvailabilityRead,
    AvailabilityUpdate,
    DoctorProfileRead,
    DoctorProfileUpdate,
)
from services import doctor_service

router = APIRouter(prefix="/doctors", tags=["doctors"])


@router.get("/", response_model=List[DoctorProfileRead])
def list_doctors(
    db: DbSession,
    specialty: Optional[str] = None,
    city: Optional[str] = None,
    q: Optional[str] = None,
    verified_only: bool = False,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    profiles = doctor_service.list_doctors(
        db, specialty=specialty, city=city, q=q, verified_only=verified_only, skip=skip, limit=limit
    )
    return [doctor_service.doctor_to_dict(p) for p in profiles]


@router.put("/me/profile", response_model=DoctorProfileRead)
def update_my_profile(payload: DoctorProfileUpdate, user: DoctorUser, db: DbSession):
    return doctor_service.doctor_to_dict(doctor_service.update_my_profile(db, user, payload))


@router.post("/me/availability", response_model=AvailabilityRead, status_code=201)
def create_availability(payload: AvailabilityCreate, user: DoctorUser, db: DbSession):
    return doctor_service.create_availability(db, user, payload)


@router.put("/me/availability/{availability_id}", response_model=AvailabilityRead)
def update_availability(availability_id: int, payload: AvailabilityUpdate, user: DoctorUser, db: DbSession):
    return doctor_service.update_availability(db, user, availability_id, payload)


@router.delete("/me/availability/{availability_id}", status_code=204)
def delete_availability(availability_id: int, user: DoctorUser, db: DbSession):
    doctor_service.delete_availability(db, user, availability_id)
    return None


@router.get("/{doctor_id}", response_model=DoctorProfileRead)
def get_doctor(doctor_id: int, db: DbSession):
    return doctor_service.doctor_to_dict(doctor_service.get_doctor(db, doctor_id))


@router.get("/{doctor_id}/availability", response_model=List[AvailabilityRead])
def get_availability(doctor_id: int, db: DbSession):
    return doctor_service.list_availability(db, doctor_id)
