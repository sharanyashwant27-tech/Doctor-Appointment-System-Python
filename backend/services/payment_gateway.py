"""Payment gateway ABC + UPI / Mock / Stripe / Razorpay (demo-ready)."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Optional
from urllib.parse import urlencode
from uuid import uuid4

from utils.config import settings
from middleware.logging import get_logger

logger = get_logger(__name__)


@dataclass
class PaymentIntent:
    gateway_ref: str
    amount: float
    currency: str
    status: str = "pending"
    upi_vpa: Optional[str] = None
    upi_payee_name: Optional[str] = None
    upi_link: Optional[str] = None
    extra: dict[str, Any] = field(default_factory=dict)


@dataclass
class PaymentResult:
    gateway_ref: str
    status: str
    raw: Optional[dict] = None


def build_upi_link(
    *,
    vpa: str,
    payee_name: str,
    amount: float,
    currency: str = "INR",
    transaction_ref: str,
    note: str = "MediBook appointment",
) -> str:
    """Standard UPI intent URL used by GPay / PhonePe / Paytm / BHIM."""
    params = {
        "pa": vpa,
        "pn": payee_name,
        "am": f"{float(amount):.2f}",
        "cu": currency or "INR",
        "tr": transaction_ref[:35],
        "tn": note[:80],
    }
    return f"upi://pay?{urlencode(params)}"


class PaymentGateway(ABC):
    @abstractmethod
    def create_payment(self, amount: float, currency: str = "INR", meta: Optional[dict] = None) -> PaymentIntent:
        ...

    @abstractmethod
    def confirm(self, gateway_ref: str, meta: Optional[dict] = None) -> PaymentResult:
        ...

    @abstractmethod
    def refund(self, gateway_ref: str, amount: Optional[float] = None) -> PaymentResult:
        ...


class UpiPaymentGateway(PaymentGateway):
    """UPI collect flow — QR / deep-link + server-side confirm (demo / production-ready shape)."""

    def create_payment(self, amount: float, currency: str = "INR", meta: Optional[dict] = None) -> PaymentIntent:
        if amount <= 0:
            raise ValueError("amount must be positive")
        meta = meta or {}
        appt_id = meta.get("appointment_id", "")
        ref = f"UPI{uuid4().hex[:10].upper()}"
        vpa = (settings.UPI_VPA or "medibook@upi").strip()
        payee = (settings.UPI_PAYEE_NAME or "MediBook Clinic").strip()
        note = f"MediBook appointment {appt_id}".strip()
        link = build_upi_link(
            vpa=vpa,
            payee_name=payee,
            amount=amount,
            currency=currency,
            transaction_ref=ref,
            note=note,
        )
        return PaymentIntent(
            gateway_ref=ref,
            amount=amount,
            currency=currency,
            status="pending",
            upi_vpa=vpa,
            upi_payee_name=payee,
            upi_link=link,
            extra={"note": note},
        )

    def confirm(self, gateway_ref: str, meta: Optional[dict] = None) -> PaymentResult:
        if meta and meta.get("force_fail"):
            return PaymentResult(gateway_ref=gateway_ref, status="failed", raw={"upi": True})
        # Demo / sandbox: accept confirm after patient completes UPI in their app
        return PaymentResult(
            gateway_ref=gateway_ref,
            status="success",
            raw={"upi": True, "upi_reference": (meta or {}).get("upi_reference")},
        )

    def refund(self, gateway_ref: str, amount: Optional[float] = None) -> PaymentResult:
        return PaymentResult(gateway_ref=gateway_ref, status="refunded", raw={"upi": True, "amount": amount})


class MockPaymentGateway(PaymentGateway):
    def create_payment(self, amount: float, currency: str = "INR", meta: Optional[dict] = None) -> PaymentIntent:
        if amount <= 0:
            raise ValueError("amount must be positive")
        ref = f"mock_{uuid4().hex[:12]}"
        return PaymentIntent(gateway_ref=ref, amount=amount, currency=currency, status="pending")

    def confirm(self, gateway_ref: str, meta: Optional[dict] = None) -> PaymentResult:
        if meta and meta.get("force_fail"):
            return PaymentResult(gateway_ref=gateway_ref, status="failed", raw={"mock": True})
        return PaymentResult(gateway_ref=gateway_ref, status="success", raw={"mock": True})

    def refund(self, gateway_ref: str, amount: Optional[float] = None) -> PaymentResult:
        return PaymentResult(gateway_ref=gateway_ref, status="refunded", raw={"mock": True, "amount": amount})


class StripePaymentGateway(PaymentGateway):
    """Stripe-ready demo gateway (simulates when keys absent or for local demo)."""

    def create_payment(self, amount: float, currency: str = "INR", meta: Optional[dict] = None) -> PaymentIntent:
        key = getattr(settings, "STRIPE_SECRET_KEY", "") or ""
        ref = f"stripe_{uuid4().hex[:12]}"
        logger.info("StripePaymentGateway.create_payment key_configured=%s ref=%s", bool(key), ref)
        return PaymentIntent(gateway_ref=ref, amount=amount, currency=currency)

    def confirm(self, gateway_ref: str, meta: Optional[dict] = None) -> PaymentResult:
        if meta and meta.get("force_fail"):
            return PaymentResult(gateway_ref=gateway_ref, status="failed", raw={"stripe_demo": True})
        return PaymentResult(gateway_ref=gateway_ref, status="success", raw={"stripe_demo": True})

    def refund(self, gateway_ref: str, amount: Optional[float] = None) -> PaymentResult:
        return PaymentResult(gateway_ref=gateway_ref, status="refunded", raw={"stripe_demo": True, "amount": amount})


class RazorpayPaymentGateway(PaymentGateway):
    """Razorpay-ready demo gateway."""

    def create_payment(self, amount: float, currency: str = "INR", meta: Optional[dict] = None) -> PaymentIntent:
        key = getattr(settings, "RAZORPAY_KEY_ID", "") or ""
        ref = f"razorpay_{uuid4().hex[:12]}"
        logger.info("RazorpayPaymentGateway.create_payment key_configured=%s ref=%s", bool(key), ref)
        return PaymentIntent(gateway_ref=ref, amount=amount, currency=currency)

    def confirm(self, gateway_ref: str, meta: Optional[dict] = None) -> PaymentResult:
        if meta and meta.get("force_fail"):
            return PaymentResult(gateway_ref=gateway_ref, status="failed", raw={"razorpay_demo": True})
        return PaymentResult(gateway_ref=gateway_ref, status="success", raw={"razorpay_demo": True})

    def refund(self, gateway_ref: str, amount: Optional[float] = None) -> PaymentResult:
        return PaymentResult(gateway_ref=gateway_ref, status="refunded", raw={"razorpay_demo": True, "amount": amount})


def get_payment_gateway() -> PaymentGateway:
    name = (settings.PAYMENT_GATEWAY or "upi").lower()
    if name == "upi":
        return UpiPaymentGateway()
    if name == "stripe":
        return StripePaymentGateway()
    if name == "razorpay":
        return RazorpayPaymentGateway()
    return MockPaymentGateway()
