"""Patient schemas."""
from datetime import date
from typing import Optional

from pydantic import BaseModel

from schemas.common import ORMModel


class PatientProfileRead(ORMModel):
    id: int
    user_id: int
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


class PatientProfileUpdate(BaseModel):
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
