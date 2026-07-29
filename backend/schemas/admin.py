"""Admin analytics / audit schemas."""
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel

from schemas.common import ORMModel


class AnalyticsResponse(BaseModel):
    users_total: int
    doctors_total: int
    patients_total: int
    appointments_total: int
    todays_appointments: int = 0
    pending_payments: int = 0
    appointments_by_status: Dict[str, int]
    payments_total: float
    payments_success_count: int
    revenue_by_month: List[Dict[str, Any]]
    appointments_by_specialty: List[Dict[str, Any]]
    peak_hours: List[Dict[str, Any]] = []
    doctor_performance: List[Dict[str, Any]] = []
    patient_visits: List[Dict[str, Any]] = []
    cancelled_count: int = 0
    department_performance: List[Dict[str, Any]] = []
    recent_activities: List[Dict[str, Any]] = []


class AuditLogRead(ORMModel):
    id: int
    actor_user_id: Optional[int] = None
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    ip: Optional[str] = None
    details: Optional[Any] = None
    created_at: Optional[datetime] = None


class DoctorVerifyRequest(BaseModel):
    is_verified: bool = True
