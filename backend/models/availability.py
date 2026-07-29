"""Availability ORM model."""
from __future__ import annotations

from datetime import date, time
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, CheckConstraint, Date, ForeignKey, Integer, Time, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base

if TYPE_CHECKING:
    from models.doctor import DoctorProfile


class Availability(Base):
    __tablename__ = "availabilities"
    __table_args__ = (
        CheckConstraint("start_time < end_time", name="ck_availability_start_before_end"),
        UniqueConstraint("doctor_id", "day_of_week", "start_time", name="uq_doctor_day_start"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    doctor_id: Mapped[int] = mapped_column(
        ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False, index=True
    )
    day_of_week: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # 0=Mon .. 6=Sun
    specific_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    slot_minutes: Mapped[int] = mapped_column(Integer, default=30)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    doctor: Mapped["DoctorProfile"] = relationship("DoctorProfile", back_populates="availabilities")
