"""Doctor schemas."""
from datetime import date, time
from typing import Optional

from pydantic import BaseModel, Field

from schemas.common import ORMModel


class DoctorProfileRead(ORMModel):
    id: int
    user_id: int
    specialty: str
    qualification: Optional[str] = None
    experience_years: int = 0
    bio: Optional[str] = None
    consultation_fee: float = 0
    clinic_address: Optional[str] = None
    city: Optional[str] = None
    rating_avg: float = 0
    is_verified: bool = False
    department_id: Optional[int] = None
    department_name: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


class DoctorAdminCreate(BaseModel):
    """Admin creates a doctor account linked to a department (specialty)."""

    email: str
    password: str = Field(min_length=8, max_length=128)
    full_name: str
    phone: Optional[str] = None
    department_id: int
    qualification: Optional[str] = None
    experience_years: int = Field(default=0, ge=0)
    consultation_fee: float = Field(default=500.0, ge=0)
    city: Optional[str] = None
    bio: Optional[str] = None
    is_verified: bool = True


class DoctorProfileUpdate(BaseModel):
    specialty: Optional[str] = None
    qualification: Optional[str] = None
    experience_years: Optional[int] = None
    bio: Optional[str] = None
    consultation_fee: Optional[float] = None
    clinic_address: Optional[str] = None
    city: Optional[str] = None
    department_id: Optional[int] = None


class AvailabilityCreate(BaseModel):
    day_of_week: Optional[int] = Field(default=None, ge=0, le=6)
    specific_date: Optional[date] = None
    start_time: time
    end_time: time
    slot_minutes: int = Field(default=30, ge=5, le=240)
    is_active: bool = True


class AvailabilityUpdate(BaseModel):
    day_of_week: Optional[int] = Field(default=None, ge=0, le=6)
    specific_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    slot_minutes: Optional[int] = Field(default=None, ge=5, le=240)
    is_active: Optional[bool] = None


class AvailabilityRead(ORMModel):
    id: int
    doctor_id: int
    day_of_week: Optional[int] = None
    specific_date: Optional[date] = None
    start_time: time
    end_time: time
    slot_minutes: int
    is_active: bool
