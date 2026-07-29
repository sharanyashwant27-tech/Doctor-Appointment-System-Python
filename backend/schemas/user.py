"""User schemas."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from models.user import UserRole
from schemas.common import EmailStr, ORMModel


class UserRead(ORMModel):
    id: int
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    role: UserRole
    is_active: bool
    created_at: Optional[datetime] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None


class UserActivate(BaseModel):
    is_active: bool
