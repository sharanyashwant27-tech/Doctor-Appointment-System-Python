"""Pydantic schemas for advanced features."""
from __future__ import annotations

from datetime import date, datetime, time
from typing import Any, Optional

from pydantic import BaseModel, Field


class SymptomCheckRequest(BaseModel):
    symptoms: str = Field(min_length=2, max_length=2000)


class VoiceBookRequest(BaseModel):
    transcript: str = Field(min_length=2, max_length=4000)


class FacePayload(BaseModel):
    image_b64: str = Field(min_length=32, max_length=5_000_000)


class RecommendRequest(BaseModel):
    symptoms: str = ""
    city: Optional[str] = None
    limit: int = Field(default=5, ge=1, le=20)


class ReviewCreate(BaseModel):
    doctor_id: int
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None
    appointment_id: Optional[int] = None


class ChatOpenRequest(BaseModel):
    doctor_id: int
    appointment_id: Optional[int] = None


class ChatPostRequest(BaseModel):
    body: str = Field(min_length=1, max_length=4000)


class ReminderCreate(BaseModel):
    medicine_name: str
    schedule_time: time
    dosage: Optional[str] = None
    days_of_week: str = "0,1,2,3,4,5,6"
    notes: Optional[str] = None


class HospitalCreate(BaseModel):
    name: str
    code: str
    city: Optional[str] = None
    address: Optional[str] = None


class AttachBranchRequest(BaseModel):
    branch_id: int
    hospital_id: int


class InsurancePolicyCreate(BaseModel):
    provider: str
    policy_number: str
    coverage_percent: float = 80.0
    valid_until: Optional[date] = None


class ClaimCreate(BaseModel):
    policy_id: int
    amount: float
    appointment_id: Optional[int] = None
    notes: Optional[str] = None


class SignRequest(BaseModel):
    entity_type: str
    entity_id: int
    signature_data: str


class CertificateCreate(BaseModel):
    patient_id: int
    cert_type: str = "fitness"
    diagnosis: Optional[str] = None
    remarks: Optional[str] = None
    valid_from: Optional[date] = None
    valid_until: Optional[date] = None
    appointment_id: Optional[int] = None


class OcrRequest(BaseModel):
    filename: str
    raw_text: Optional[str] = None


class AssistantRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)


class ERxSignRequest(BaseModel):
    signature_data: Optional[str] = None


class OrmOut(BaseModel):
    model_config = {"from_attributes": True}


class ReviewOut(OrmOut):
    id: int
    doctor_id: int
    patient_id: int
    rating: int
    comment: Optional[str] = None
    created_at: Optional[datetime] = None


class ThreadOut(OrmOut):
    id: int
    patient_id: int
    doctor_id: int
    subject: Optional[str] = None
    is_active: bool


class MessageOut(OrmOut):
    id: int
    thread_id: int
    sender_user_id: int
    body: str
    created_at: Optional[datetime] = None


class ReminderOut(OrmOut):
    id: int
    medicine_name: str
    dosage: Optional[str] = None
    schedule_time: time
    days_of_week: str
    notes: Optional[str] = None
    is_active: bool


class HospitalOut(OrmOut):
    id: int
    name: str
    code: str
    city: Optional[str] = None
    address: Optional[str] = None
    is_active: bool


class PolicyOut(OrmOut):
    id: int
    provider: str
    policy_number: str
    coverage_percent: float
    valid_until: Optional[date] = None
    is_active: bool


class ClaimOut(OrmOut):
    id: int
    policy_id: int
    amount: float
    status: str
    claim_ref: Optional[str] = None
    notes: Optional[str] = None


class CertificateOut(OrmOut):
    id: int
    patient_id: int
    doctor_id: int
    cert_type: str
    diagnosis: Optional[str] = None
    remarks: Optional[str] = None
    valid_from: Optional[date] = None
    valid_until: Optional[date] = None


class OcrOut(OrmOut):
    id: int
    filename: str
    extracted_text: str
    findings: dict[str, Any]
