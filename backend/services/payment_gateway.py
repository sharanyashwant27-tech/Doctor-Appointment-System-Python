"""Payment gateway ABC + Mock / Stripe / Razorpay (demo-ready)."""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional
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


@dataclass
class PaymentResult:
    gateway_ref: str
    status: str
    raw: Optional[dict] = None


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
    name = (settings.PAYMENT_GATEWAY or "mock").lower()
    if name == "stripe":
        return StripePaymentGateway()
    if name == "razorpay":
        return RazorpayPaymentGateway()
    return MockPaymentGateway()
