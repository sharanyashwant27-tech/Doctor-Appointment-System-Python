"""Doctor ORM model — table `doctors` (design: Doctors)."""
from __future__ import annotations

from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base

if TYPE_CHECKING:
    from models.appointment import Appointment
    from models.availability import Availability
    from models.user import User


class DoctorProfile(Base):
    """
    Design columns: id, user_id, specialization, experience, qualification,
    consultation_fee, availability (→ availabilities table), rating
    """

    __tablename__ = "doctors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    # Design: specialization
    specialty: Mapped[str] = mapped_column("specialization", String(120), index=True, nullable=False)
    qualification: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    # Design: experience
    experience_years: Mapped[int] = mapped_column("experience", Integer, default=0)
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    consultation_fee: Mapped[float] = mapped_column(Float, default=0.0)
    clinic_address: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), index=True, nullable=True)
    # Design: rating
    rating_avg: Mapped[float] = mapped_column("rating", Float, default=0.0)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    department_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)
    branch_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)

    user: Mapped["User"] = relationship("User", back_populates="doctor_profile")
    availabilities: Mapped[List["Availability"]] = relationship(
        "Availability", back_populates="doctor", cascade="all, delete-orphan"
    )
    appointments: Mapped[List["Appointment"]] = relationship("Appointment", back_populates="doctor")
