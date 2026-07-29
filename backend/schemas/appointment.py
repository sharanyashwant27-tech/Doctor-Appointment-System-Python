"""Appointment schemas."""
from datetime import date, datetime, time
from typing import Optional

from pydantic import BaseModel, Field

from models.appointment import AppointmentStatus
from schemas.common import ORMModel


class AppointmentCreate(BaseModel):
    doctor_id: int
    scheduled_at: datetime
    duration_minutes: int = Field(default=30, ge=5, le=240)
    reason: Optional[str] = None
    consultation_mode: str = "in_person"


class AppointmentRead(ORMModel):
    id: int
    patient_id: int
    doctor_id: int
    scheduled_at: datetime
    appointment_date: Optional[date] = None
    appointment_time: Optional[time] = None
    duration_minutes: int
    status: AppointmentStatus
    payment_status: Optional[str] = None
    reason: Optional[str] = None
    notes: Optional[str] = None
    cancelled_by: Optional[str] = None
    cancel_reason: Optional[str] = None
    consultation_mode: Optional[str] = None
    meeting_url: Optional[str] = None
    qr_token: Optional[str] = None
    token_number: Optional[int] = None
    checked_in_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    patient_name: Optional[str] = None
    doctor_name: Optional[str] = None
    specialty: Optional[str] = None


class AppointmentReschedule(BaseModel):
    scheduled_at: datetime


class AppointmentCancel(BaseModel):
    cancel_reason: Optional[str] = None


class AppointmentReject(BaseModel):
    notes: Optional[str] = None


class AppointmentComplete(BaseModel):
    notes: Optional[str] = None
