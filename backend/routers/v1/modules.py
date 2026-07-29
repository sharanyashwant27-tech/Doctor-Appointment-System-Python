"""Module APIs — waiting list, org, clinical, check-in."""
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, UploadFile
from pydantic import BaseModel

from api.deps import AdminUser, CurrentUser, DbSession, PatientUser, require_roles
from models.user import User
from schemas.common import Message
from services import module_service

router = APIRouter(tags=["modules"])


class WaitingJoin(BaseModel):
    doctor_id: int
    preferred_date: Optional[date] = None
    notes: Optional[str] = None


class CheckInBody(BaseModel):
    qr_token: str


class DeptCreate(BaseModel):
    name: str
    description: Optional[str] = None


class BranchCreate(BaseModel):
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None


class AllergyCreate(BaseModel):
    name: str
    severity: Optional[str] = None
    notes: Optional[str] = None


class VaccinationCreate(BaseModel):
    vaccine_name: str
    dose: Optional[str] = None
    administered_on: Optional[date] = None
    notes: Optional[str] = None


@router.post("/waiting-list/")
def join_wait(payload: WaitingJoin, user: PatientUser, db: DbSession):
    e = module_service.join_waiting_list(db, user, payload.doctor_id, payload.preferred_date, payload.notes)
    return {"id": e.id, "doctor_id": e.doctor_id, "status": e.status.value, "preferred_date": e.preferred_date}


@router.get("/waiting-list/")
def list_wait(user: CurrentUser, db: DbSession, doctor_id: Optional[int] = None):
    items = module_service.list_waiting(db, user, doctor_id=doctor_id)
    return [
        {
            "id": e.id,
            "patient_id": e.patient_id,
            "doctor_id": e.doctor_id,
            "status": e.status.value,
            "preferred_date": e.preferred_date,
            "notes": e.notes,
        }
        for e in items
    ]


@router.post("/waiting-list/{entry_id}/cancel")
def cancel_wait(entry_id: int, user: CurrentUser, db: DbSession):
    e = module_service.cancel_waiting(db, user, entry_id)
    return {"id": e.id, "status": e.status.value}


@router.post("/appointments/{appointment_id}/no-show")
def no_show(appointment_id: int, db: DbSession, user: User = Depends(require_roles("doctor", "admin"))):
    from services import appointment_service

    appt = module_service.mark_no_show(db, user, appointment_id)
    return appointment_service.appointment_to_dict(appt)


@router.post("/appointments/check-in")
def check_in(payload: CheckInBody, user: CurrentUser, db: DbSession):
    from services import appointment_service

    appt = module_service.check_in(db, user, payload.qr_token)
    return appointment_service.appointment_to_dict(appt)


@router.get("/appointments/{appointment_id}/qr")
def appointment_qr(appointment_id: int, user: CurrentUser, db: DbSession):
    return module_service.qr_payload(db, user, appointment_id)


@router.get("/departments/")
def departments(db: DbSession):
    return [{"id": d.id, "name": d.name, "description": d.description, "is_active": d.is_active} for d in module_service.list_departments(db)]


@router.post("/departments/", status_code=201)
def create_dept(payload: DeptCreate, _: AdminUser, db: DbSession):
    d = module_service.create_department(db, payload.name, payload.description)
    return {"id": d.id, "name": d.name}


@router.get("/branches/")
def branches(db: DbSession):
    return [
        {"id": b.id, "name": b.name, "address": b.address, "city": b.city, "phone": b.phone, "is_active": b.is_active}
        for b in module_service.list_branches(db)
    ]


@router.post("/branches/", status_code=201)
def create_branch(payload: BranchCreate, _: AdminUser, db: DbSession):
    b = module_service.create_branch(db, payload.name, payload.address, payload.city, payload.phone)
    return {"id": b.id, "name": b.name}


@router.get("/permissions/")
def permissions(_: AdminUser, db: DbSession):
    return [{"id": p.id, "code": p.code, "description": p.description, "role": p.role} for p in module_service.list_permissions(db)]


@router.get("/allergies/")
def allergies(user: CurrentUser, db: DbSession):
    return [
        {"id": a.id, "name": a.name, "severity": a.severity, "notes": a.notes}
        for a in module_service.list_allergies(db, user)
    ]


@router.post("/allergies/", status_code=201)
def create_allergy(payload: AllergyCreate, user: PatientUser, db: DbSession):
    a = module_service.add_allergy(db, user, payload.name, payload.severity, payload.notes)
    return {"id": a.id, "name": a.name}


@router.get("/vaccinations/")
def vaccinations(user: CurrentUser, db: DbSession):
    return [
        {"id": v.id, "vaccine_name": v.vaccine_name, "dose": v.dose, "administered_on": v.administered_on}
        for v in module_service.list_vaccinations(db, user)
    ]


@router.post("/vaccinations/", status_code=201)
def create_vaccination(payload: VaccinationCreate, user: PatientUser, db: DbSession):
    v = module_service.add_vaccination(db, user, payload.vaccine_name, payload.dose, payload.administered_on, payload.notes)
    return {"id": v.id, "vaccine_name": v.vaccine_name}


@router.get("/lab-reports/")
def lab_reports(user: CurrentUser, db: DbSession):
    return [{"id": r.id, "title": r.title, "file_path": r.file_path, "notes": r.notes} for r in module_service.list_lab_reports(db, user)]


@router.post("/lab-reports/", status_code=201)
async def upload_lab(
    user: PatientUser,
    db: DbSession,
    title: str = Form(...),
    notes: Optional[str] = Form(None),
    file: UploadFile = File(...),
):
    content = await file.read()
    r = module_service.save_lab_report(db, user, title, file.filename or "report.bin", content, notes)
    return {"id": r.id, "title": r.title, "file_path": r.file_path}
