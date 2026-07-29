"""Appointment ORM model — table `appointments`."""
from __future__ import annotations

import enum
from datetime import date, datetime, time
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Index, Integer, String, Text, Time, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base

if TYPE_CHECKING:
    from models.doctor import DoctorProfile
    from models.medical_record import MedicalRecord
    from models.patient import PatientProfile
    from models.payment import Payment


class AppointmentStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    confirmed = "confirmed"
    rejected = "rejected"
    cancelled = "cancelled"
    completed = "completed"
    rescheduled = "rescheduled"
    no_show = "no_show"


class PaymentStatusOnAppointment(str, enum.Enum):
    unpaid = "unpaid"
    pending = "pending"
    paid = "paid"
    refunded = "refunded"
    failed = "failed"


class Appointment(Base):
    """
    Design columns: id, patient_id, doctor_id, appointment_date, appointment_time,
    status, notes, payment_status
    `scheduled_at` is retained as the canonical UTC timestamp (date+time combined).
    """

    __tablename__ = "appointments"
    __table_args__ = (
        Index("ix_appointments_doctor_scheduled", "doctor_id", "scheduled_at"),
        Index("ix_appointments_patient_scheduled", "patient_id", "scheduled_at"),
        Index("ix_appointments_date", "appointment_date"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), index=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id"), index=True)
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    # Design: appointment_date + appointment_time (denormalized for queries/reports)
    appointment_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True, index=True)
    appointment_time: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=30)
    status: Mapped[AppointmentStatus] = mapped_column(
        Enum(AppointmentStatus, name="appointment_status", native_enum=False),
        default=AppointmentStatus.pending,
        index=True,
    )
    # Design: payment_status on appointment
    payment_status: Mapped[PaymentStatusOnAppointment] = mapped_column(
        Enum(PaymentStatusOnAppointment, name="appt_payment_status", native_enum=False),
        default=PaymentStatusOnAppointment.unpaid,
        index=True,
    )
    reason: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cancelled_by: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    cancel_reason: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    consultation_mode: Mapped[str] = mapped_column(String(30), default="in_person")
    meeting_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    qr_token: Mapped[Optional[str]] = mapped_column(String(64), unique=True, nullable=True, index=True)
    token_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    checked_in_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    branch_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    patient: Mapped["PatientProfile"] = relationship("PatientProfile", back_populates="appointments")
    doctor: Mapped["DoctorProfile"] = relationship("DoctorProfile", back_populates="appointments")
    medical_records: Mapped[List["MedicalRecord"]] = relationship(
        "MedicalRecord", back_populates="appointment"
    )
    payments: Mapped[List["Payment"]] = relationship("Payment", back_populates="appointment")
