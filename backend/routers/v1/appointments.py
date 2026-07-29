"""Appointments API."""
from typing import List, Optional

from fastapi import APIRouter, Query

from api.deps import CurrentUser, DbSession, DoctorUser, PatientUser, require_roles
from models.appointment import AppointmentStatus
from models.user import User
from fastapi import Depends
from schemas.appointment import (
    AppointmentCancel,
    AppointmentComplete,
    AppointmentCreate,
    AppointmentRead,
    AppointmentReject,
    AppointmentReschedule,
)
from services import appointment_service

router = APIRouter(prefix="/appointments", tags=["appointments"])


@router.post("/", response_model=AppointmentRead, status_code=201)
def book(payload: AppointmentCreate, user: PatientUser, db: DbSession):
    appt = appointment_service.book(db, user, payload)
    return appointment_service.appointment_to_dict(appt)


@router.get("/", response_model=List[AppointmentRead])
def list_appointments(
    user: CurrentUser,
    db: DbSession,
    status: Optional[AppointmentStatus] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    items = appointment_service.list_appointments(db, user, status=status, skip=skip, limit=limit)
    return [appointment_service.appointment_to_dict(a) for a in items]


@router.get("/{appointment_id}", response_model=AppointmentRead)
def get_appointment(appointment_id: int, user: CurrentUser, db: DbSession):
    appt = appointment_service.get_appointment(db, appointment_id)
    # scoping via list-like checks
    role = user.role.value if hasattr(user.role, "value") else str(user.role)
    if role == "patient":
        from services.appointment_service import _require_patient_owner

        _require_patient_owner(db, user, appt)
    elif role == "doctor":
        from services.appointment_service import _require_doctor_owner

        _require_doctor_owner(db, user, appt)
    return appointment_service.appointment_to_dict(appt)


@router.post("/{appointment_id}/approve", response_model=AppointmentRead)
def approve(appointment_id: int, user: DoctorUser, db: DbSession):
    return appointment_service.appointment_to_dict(appointment_service.approve(db, user, appointment_id))


@router.post("/{appointment_id}/reject", response_model=AppointmentRead)
def reject(appointment_id: int, payload: AppointmentReject, user: DoctorUser, db: DbSession):
    return appointment_service.appointment_to_dict(
        appointment_service.reject(db, user, appointment_id, notes=payload.notes)
    )


@router.post("/{appointment_id}/cancel", response_model=AppointmentRead)
def cancel(
    appointment_id: int,
    payload: AppointmentCancel,
    db: DbSession,
    user: User = Depends(require_roles("patient", "doctor", "admin")),
):
    return appointment_service.appointment_to_dict(appointment_service.cancel(db, user, appointment_id, payload))


@router.post("/{appointment_id}/reschedule", response_model=AppointmentRead)
def reschedule(
    appointment_id: int,
    payload: AppointmentReschedule,
    db: DbSession,
    user: User = Depends(require_roles("patient", "doctor")),
):
    return appointment_service.appointment_to_dict(
        appointment_service.reschedule(db, user, appointment_id, payload)
    )


@router.post("/{appointment_id}/complete", response_model=AppointmentRead)
def complete(appointment_id: int, payload: AppointmentComplete, user: DoctorUser, db: DbSession):
    return appointment_service.appointment_to_dict(
        appointment_service.complete(db, user, appointment_id, notes=payload.notes)
    )
