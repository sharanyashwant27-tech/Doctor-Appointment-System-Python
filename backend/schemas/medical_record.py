"""Medical record schemas."""
from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, Field

from schemas.common import ORMModel


class MedicalRecordCreate(BaseModel):
    appointment_id: int
    diagnosis: Optional[str] = None
    symptoms: Optional[str] = None
    notes: Optional[str] = None


class PrescriptionCreate(BaseModel):
    medicines: List[dict[str, Any]] = Field(default_factory=list)
    instructions: Optional[str] = None
    valid_until: Optional[datetime] = None


class PrescriptionRead(ORMModel):
    id: int
    medical_record_id: int
    medicines: List[dict[str, Any]] = Field(default_factory=list)
    instructions: Optional[str] = None
    valid_until: Optional[datetime] = None
    created_at: Optional[datetime] = None


class MedicalRecordRead(ORMModel):
    id: int
    appointment_id: int
    patient_id: int
    doctor_id: int
    diagnosis: Optional[str] = None
    symptoms: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    prescriptions: List[PrescriptionRead] = Field(default_factory=list)
    patient_name: Optional[str] = None
    doctor_name: Optional[str] = None
