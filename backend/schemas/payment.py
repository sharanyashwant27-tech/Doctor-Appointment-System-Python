"""Payment schemas."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from models.payment import PaymentStatus
from schemas.common import ORMModel


class CheckoutRequest(BaseModel):
    appointment_id: int
    currency: str = "INR"


class ConfirmRequest(BaseModel):
    payment_id: int
    force_fail: bool = False
    upi_reference: Optional[str] = None


class PaymentRead(ORMModel):
    id: int
    appointment_id: int
    patient_id: int
    amount: float
    currency: str
    status: PaymentStatus
    gateway: str
    gateway_ref: Optional[str] = None
    payment_mode: Optional[str] = None
    transaction_id: Optional[str] = None
    invoice_number: Optional[str] = None
    paid_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    patient_name: Optional[str] = None
    doctor_name: Optional[str] = None
    upi_vpa: Optional[str] = None
    upi_payee_name: Optional[str] = None
    upi_link: Optional[str] = None
    upi_qr_data: Optional[str] = None
    payment_instructions: Optional[str] = None
