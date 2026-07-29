"""Medical records API."""
from typing import List

from fastapi import APIRouter

from api.deps import CurrentUser, DbSession, DoctorUser
from schemas.medical_record import MedicalRecordCreate, MedicalRecordRead, PrescriptionCreate
from services import medical_record_service

router = APIRouter(prefix="/medical-records", tags=["medical-records"])


@router.post("/", response_model=MedicalRecordRead, status_code=201)
def create_record(payload: MedicalRecordCreate, user: DoctorUser, db: DbSession):
    return medical_record_service.create_record(db, user, payload)


@router.get("/", response_model=List[MedicalRecordRead])
def list_records(user: CurrentUser, db: DbSession):
    return medical_record_service.list_records(db, user)


@router.get("/{record_id}", response_model=MedicalRecordRead)
def get_record(record_id: int, user: CurrentUser, db: DbSession):
    return medical_record_service.get_record(db, user, record_id)


@router.post("/{record_id}/prescriptions", response_model=MedicalRecordRead, status_code=201)
def add_prescription(record_id: int, payload: PrescriptionCreate, user: DoctorUser, db: DbSession):
    return medical_record_service.add_prescription(db, user, record_id, payload)
