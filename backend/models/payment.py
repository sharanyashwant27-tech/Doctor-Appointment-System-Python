"""Payment ORM model — table `payments`."""
from __future__ import annotations

import enum
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base

if TYPE_CHECKING:
    from models.appointment import Appointment


class PaymentStatus(str, enum.Enum):
    pending = "pending"
    success = "success"
    failed = "failed"
    refunded = "refunded"


class Payment(Base):
    """
    Design columns: id, appointment_id, amount, payment_mode, status, transaction_id
    """

    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    appointment_id: Mapped[int] = mapped_column(ForeignKey("appointments.id"), index=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), index=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="INR")
    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, name="payment_status", native_enum=False),
        default=PaymentStatus.pending,
        index=True,
    )
    # Design: payment_mode
    gateway: Mapped[str] = mapped_column("payment_mode", String(50), default="mock")
    # Design: transaction_id
    gateway_ref: Mapped[Optional[str]] = mapped_column("transaction_id", String(255), nullable=True)
    invoice_number: Mapped[Optional[str]] = mapped_column(String(64), unique=True, nullable=True)
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    appointment: Mapped["Appointment"] = relationship("Appointment", back_populates="payments")
