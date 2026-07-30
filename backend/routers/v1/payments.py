"""Payments API."""
from typing import List

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from io import BytesIO

from api.deps import CurrentUser, DbSession, PatientUser, require_roles
from models.user import User
from fastapi import Depends
from schemas.payment import CheckoutRequest, ConfirmRequest, PaymentRead
from services import payment_service

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("/checkout", response_model=PaymentRead)
def checkout(payload: CheckoutRequest, user: PatientUser, db: DbSession):
    return payment_service.checkout(db, user, payload.appointment_id, payload.currency)


@router.post("/confirm", response_model=PaymentRead)
def confirm(payload: ConfirmRequest, user: PatientUser, db: DbSession):
    return payment_service.confirm(
        db,
        user,
        payload.payment_id,
        force_fail=payload.force_fail,
        upi_reference=payload.upi_reference,
    )


@router.get("/", response_model=List[PaymentRead])
def list_payments(user: CurrentUser, db: DbSession):
    return payment_service.list_payments(db, user)


@router.get("/{payment_id}", response_model=PaymentRead)
def get_payment(payment_id: int, user: CurrentUser, db: DbSession):
    return payment_service.get_payment(db, user, payment_id)


@router.post("/{payment_id}/refund", response_model=PaymentRead)
def refund_payment(
    payment_id: int,
    db: DbSession,
    user: User = Depends(require_roles("patient", "admin")),
):
    return payment_service.refund(db, user, payment_id)


@router.get("/{payment_id}/invoice.pdf")
def invoice_pdf(payment_id: int, user: CurrentUser, db: DbSession):
    pdf = payment_service.invoice_pdf(db, user, payment_id)
    return StreamingResponse(
        BytesIO(pdf),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="invoice-{payment_id}.pdf"'},
    )
