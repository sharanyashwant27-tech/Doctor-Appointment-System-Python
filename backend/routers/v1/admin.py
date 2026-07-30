"""Admin API — analytics, audit, export, verify doctors."""
from typing import List, Optional

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from io import BytesIO

from api.deps import AdminUser, DbSession
from schemas.admin import AnalyticsResponse, AuditLogRead, DoctorVerifyRequest
from schemas.doctor import DoctorAdminCreate, DoctorProfileRead
from schemas.user import UserRead
from services import admin_service, audit_service, doctor_service, user_service
from reports.export_service import export_resource

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/analytics", response_model=AnalyticsResponse)
def get_analytics(_: AdminUser, db: DbSession):
    return admin_service.analytics(db)


@router.get("/audit-logs", response_model=List[AuditLogRead])
def get_audit_logs(
    _: AdminUser,
    db: DbSession,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    entity_type: Optional[str] = None,
):
    return audit_service.list_audit_logs(db, skip=skip, limit=limit, entity_type=entity_type)


@router.get("/export/{resource}")
def export(
    resource: str,
    _: AdminUser,
    db: DbSession,
    format: str = Query("csv", alias="format"),
):
    content, media, filename = export_resource(db, resource, format)
    return StreamingResponse(
        BytesIO(content),
        media_type=media,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/users", response_model=List[UserRead])
def admin_users(_: AdminUser, db: DbSession):
    return user_service.list_users(db)


@router.post("/doctors", response_model=DoctorProfileRead, status_code=201)
def create_doctor(payload: DoctorAdminCreate, admin: AdminUser, db: DbSession):
    """Create a doctor and assign them to a department from the dropdown list."""
    profile = doctor_service.create_doctor_by_admin(db, payload, actor_id=admin.id)
    return doctor_service.doctor_to_dict(profile, db)


@router.patch("/doctors/{doctor_id}/verify", response_model=DoctorProfileRead)
def verify_doctor(doctor_id: int, payload: DoctorVerifyRequest, admin: AdminUser, db: DbSession):
    profile = doctor_service.verify_doctor(db, doctor_id, payload.is_verified, actor_id=admin.id)
    return doctor_service.doctor_to_dict(profile, db)
