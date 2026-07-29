"""
Public REST API matching product endpoint design.

Mounted at /api — keeps /api/v1 for the extended MediBook surface.

Authentication
  POST /api/register
  POST /api/login
  POST /api/logout
  POST /api/forgot-password

Doctors
  GET    /api/doctors
  GET    /api/doctor/{id}
  POST   /api/doctor
  PUT    /api/doctor
  DELETE /api/doctor

Patients
  GET  /api/patients
  GET  /api/patient/{id}
  POST /api/patient

Appointments
  POST   /api/appointments
  GET    /api/appointments
  PUT    /api/appointments/{id}
  DELETE /api/appointments/{id}

Payments
  POST /api/payment
  GET  /api/payment/history
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field

from api.deps import AdminUser, CurrentUser, DbSession, DoctorUser, PatientUser, require_roles
from utils.exceptions import ValidationAppError
from models.user import User, UserRole
from schemas.appointment import AppointmentCancel, AppointmentCreate, AppointmentReschedule
from schemas.auth import ForgotPasswordRequest, LoginRequest, LogoutRequest, RegisterRequest, TokenPair
from schemas.common import EmailStr, Message
from schemas.doctor import DoctorProfileRead, DoctorProfileUpdate
from schemas.patient import PatientProfileRead, PatientProfileUpdate
from schemas.payment import PaymentRead
from schemas.user import UserRead
from auth import auth_extras, auth_service
from services import (
    appointment_service,
    doctor_service,
    patient_service,
    payment_service,
    user_service,
)

router = APIRouter(prefix="/api", tags=["public-api"])


# ── Auth ─────────────────────────────────────────────────────────────────────


@router.post("/register", response_model=UserRead, status_code=201, summary="Register user")
def register(payload: RegisterRequest, db: DbSession):
    return auth_service.register_user(db, payload)


@router.post("/login", response_model=TokenPair, summary="JWT login")
def login(payload: LoginRequest, db: DbSession):
    return auth_service.login_user(db, payload)


@router.post("/logout", response_model=Message, summary="Logout / revoke refresh token")
def logout(payload: LogoutRequest, db: DbSession):
    auth_service.logout_user(db, payload.refresh_token)
    return Message(message="Logged out")


@router.post("/forgot-password", summary="Forgot password")
def forgot_password(payload: ForgotPasswordRequest, db: DbSession):
    return auth_extras.forgot_password(db, payload.email)


# ── Doctors ──────────────────────────────────────────────────────────────────


class DoctorCreateRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str
    phone: Optional[str] = None
    specialty: str = "General"
    qualification: Optional[str] = None
    experience_years: int = 0
    consultation_fee: float = 500.0
    city: Optional[str] = None


@router.get("/doctors", response_model=List[DoctorProfileRead], summary="List doctors")
def list_doctors(
    db: DbSession,
    specialty: Optional[str] = None,
    city: Optional[str] = None,
    q: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    profiles = doctor_service.list_doctors(
        db, specialty=specialty, city=city, q=q, verified_only=False, skip=skip, limit=limit
    )
    return [doctor_service.doctor_to_dict(p) for p in profiles]


@router.get("/doctor/{id}", response_model=DoctorProfileRead, summary="Get doctor by id")
def get_doctor(id: int, db: DbSession):
    return doctor_service.doctor_to_dict(doctor_service.get_doctor(db, id))


@router.post("/doctor", response_model=DoctorProfileRead, status_code=201, summary="Create doctor")
def create_doctor(payload: DoctorCreateRequest, admin: AdminUser, db: DbSession):
    user = auth_service.register_user(
        db,
        RegisterRequest(
            email=payload.email,
            password=payload.password,
            full_name=payload.full_name,
            phone=payload.phone,
            role=UserRole.doctor,
            specialty=payload.specialty,
        ),
    )
    profile = doctor_service.get_profile_for_user(db, user)
    profile.qualification = payload.qualification
    profile.experience_years = payload.experience_years
    profile.consultation_fee = payload.consultation_fee
    profile.city = payload.city
    profile.is_verified = True
    db.commit()
    return doctor_service.doctor_to_dict(doctor_service.get_doctor(db, profile.id))


@router.put("/doctor", response_model=DoctorProfileRead, summary="Update current doctor profile")
def update_doctor(payload: DoctorProfileUpdate, user: DoctorUser, db: DbSession):
    return doctor_service.doctor_to_dict(doctor_service.update_my_profile(db, user, payload))


@router.delete("/doctor", response_model=Message, summary="Deactivate doctor (self or admin by ?id=)")
def delete_doctor(
    db: DbSession,
    user: User = Depends(require_roles("doctor", "admin")),
    id: Optional[int] = Query(None, description="Doctor profile id (admin)"),
):
    role = user.role.value if isinstance(user.role, UserRole) else str(user.role)
    if role == "admin":
        if id is None:
            raise ValidationAppError("Admin must pass id query param")
        profile = doctor_service.get_doctor(db, id)
        user_service.set_active(db, profile.user_id, False, actor_id=user.id)
    else:
        profile = doctor_service.get_profile_for_user(db, user)
        user_service.set_active(db, profile.user_id, False, actor_id=user.id)
    return Message(message="Doctor deactivated")


# ── Patients ─────────────────────────────────────────────────────────────────


class PatientCreateRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str
    phone: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    address: Optional[str] = None


@router.get("/patients", response_model=List[PatientProfileRead], summary="List patients")
def list_patients(
    db: DbSession,
    _: User = Depends(require_roles("admin", "doctor")),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    from sqlalchemy import select
    from sqlalchemy.orm import joinedload
    from models.patient import PatientProfile

    rows = db.scalars(
        select(PatientProfile)
        .options(joinedload(PatientProfile.user))
        .offset(skip)
        .limit(limit)
    ).unique().all()
    return [patient_service.patient_to_dict(p) for p in rows]


@router.get("/patient/{id}", response_model=PatientProfileRead, summary="Get patient by id")
def get_patient(
    id: int,
    db: DbSession,
    user: User = Depends(require_roles("admin", "doctor", "patient")),
):
    return patient_service.patient_to_dict(patient_service.get_patient(db, id, user))


@router.post("/patient", response_model=PatientProfileRead, status_code=201, summary="Create patient")
def create_patient(payload: PatientCreateRequest, _: AdminUser, db: DbSession):
    created = auth_service.register_user(
        db,
        RegisterRequest(
            email=payload.email,
            password=payload.password,
            full_name=payload.full_name,
            phone=payload.phone,
            role=UserRole.patient,
        ),
    )
    profile = patient_service.get_profile_for_user(db, created)
    upd = PatientProfileUpdate(
        gender=payload.gender,
        blood_group=payload.blood_group,
        address=payload.address,
    )
    return patient_service.patient_to_dict(patient_service.update_my_profile(db, created, upd))


# ── Appointments ─────────────────────────────────────────────────────────────


class AppointmentUpdateRequest(BaseModel):
    scheduled_at: Optional[datetime] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    cancel_reason: Optional[str] = None


@router.post("/appointments", status_code=201, summary="Book appointment")
def create_appointment(payload: AppointmentCreate, user: PatientUser, db: DbSession):
    appt = appointment_service.book(db, user, payload)
    return appointment_service.appointment_to_dict(appt)


@router.get("/appointments", summary="List appointments")
def get_appointments(user: CurrentUser, db: DbSession):
    items = appointment_service.list_appointments(db, user)
    return [appointment_service.appointment_to_dict(a) for a in items]


@router.put("/appointments/{id}", summary="Update / reschedule appointment")
def update_appointment(
    id: int,
    payload: AppointmentUpdateRequest,
    db: DbSession,
    user: User = Depends(require_roles("patient", "doctor", "admin")),
):
    appt = appointment_service.get_appointment(db, id)
    role = user.role.value if isinstance(user.role, UserRole) else str(user.role)
    if role == "patient":
        appointment_service._require_patient_owner(db, user, appt)
    elif role == "doctor":
        appointment_service._require_doctor_owner(db, user, appt)

    if payload.scheduled_at is not None:
        appt = appointment_service.reschedule(
            db, user, id, AppointmentReschedule(scheduled_at=payload.scheduled_at)
        )
        return appointment_service.appointment_to_dict(appt)

    if payload.status == "cancelled":
        appt = appointment_service.cancel(
            db, user, id, AppointmentCancel(cancel_reason=payload.cancel_reason)
        )
        return appointment_service.appointment_to_dict(appt)

    if payload.notes is not None:
        appt.notes = payload.notes
        db.commit()
        return appointment_service.appointment_to_dict(appointment_service.get_appointment(db, id))

    raise ValidationAppError("Provide scheduled_at, status=cancelled, or notes")


@router.delete("/appointments/{id}", summary="Cancel appointment")
def delete_appointment(
    id: int,
    db: DbSession,
    user: User = Depends(require_roles("patient", "doctor", "admin")),
):
    appt = appointment_service.cancel(db, user, id, AppointmentCancel(cancel_reason="Deleted via API"))
    return appointment_service.appointment_to_dict(appt)


# ── Payments ─────────────────────────────────────────────────────────────────


class PaymentCreateRequest(BaseModel):
    appointment_id: int
    currency: str = "INR"
    confirm: bool = True


@router.post("/payment", response_model=PaymentRead, summary="Create / checkout payment")
def create_payment(payload: PaymentCreateRequest, user: PatientUser, db: DbSession):
    payment = payment_service.checkout(db, user, payload.appointment_id, payload.currency)
    if payload.confirm and payment.get("status") == "pending":
        payment = payment_service.confirm(db, user, payment["id"])
    return payment


@router.get("/payment/history", response_model=List[PaymentRead], summary="Payment history")
def payment_history(user: CurrentUser, db: DbSession):
    return payment_service.list_payments(db, user)
