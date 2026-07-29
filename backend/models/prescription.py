"""Prescription ORM model — table `prescriptions`."""
from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING, Any, Optional

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from database.base import Base

if TYPE_CHECKING:
    from models.medical_record import MedicalRecord


class Prescription(Base):
    """
    Design columns: id, appointment_id, doctor_id, patient_id, medicine, dosage, instructions
    `medicines` JSON retains multi-drug prescriptions; medicine/dosage mirror the primary line.
    """

    __tablename__ = "prescriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    medical_record_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("medical_records.id", ondelete="CASCADE"), nullable=True, index=True
    )
    appointment_id: Mapped[Optional[int]] = mapped_column(ForeignKey("appointments.id"), nullable=True, index=True)
    doctor_id: Mapped[Optional[int]] = mapped_column(ForeignKey("doctors.id"), nullable=True, index=True)
    patient_id: Mapped[Optional[int]] = mapped_column(ForeignKey("patients.id"), nullable=True, index=True)
    medicine: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    dosage: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    medicines: Mapped[Any] = mapped_column(JSON, nullable=False, default=list)
    valid_until: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    medical_record: Mapped[Optional["MedicalRecord"]] = relationship(
        "MedicalRecord", back_populates="prescriptions"
    )
