"""Patients API."""
from fastapi import APIRouter

from api.deps import CurrentUser, DbSession, PatientUser, require_roles
from schemas.patient import PatientProfileRead, PatientProfileUpdate
from services import patient_service
from fastapi import Depends
from models.user import User

router = APIRouter(prefix="/patients", tags=["patients"])


@router.get("/me/profile", response_model=PatientProfileRead)
def my_profile(user: PatientUser, db: DbSession):
    return patient_service.patient_to_dict(patient_service.get_profile_for_user(db, user))


@router.put("/me/profile", response_model=PatientProfileRead)
def update_my_profile(payload: PatientProfileUpdate, user: PatientUser, db: DbSession):
    return patient_service.patient_to_dict(patient_service.update_my_profile(db, user, payload))


@router.get("/{patient_id}", response_model=PatientProfileRead)
def get_patient(
    patient_id: int,
    db: DbSession,
    user: User = Depends(require_roles("admin", "doctor", "patient")),
):
    return patient_service.patient_to_dict(patient_service.get_patient(db, patient_id, user))
