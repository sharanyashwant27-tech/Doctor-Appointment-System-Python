"""Twilio SMS with console fallback when credentials are not configured."""
from __future__ import annotations

from utils.config import settings
from middleware.logging import get_logger

logger = get_logger(__name__)


def send_sms(phone: str, message: str) -> bool:
    """Send SMS via Twilio when configured; otherwise log (dev-safe)."""
    if not phone:
        logger.warning("SMS skipped: empty phone")
        return False

    sid = (settings.TWILIO_ACCOUNT_SID or "").strip()
    token = (settings.TWILIO_AUTH_TOKEN or "").strip()
    from_number = (settings.TWILIO_FROM_NUMBER or "").strip()

    if not (sid and token and from_number):
        logger.info("[sms:console] to=%s message=%s", phone, message)
        return True

    try:
        from twilio.rest import Client

        client = Client(sid, token)
        result = client.messages.create(body=message, from_=from_number, to=phone)
        logger.info("SMS sent to=%s sid=%s", phone, result.sid)
        return True
    except Exception as exc:  # noqa: BLE001
        logger.exception("SMS send failed to=%s: %s", phone, exc)
        return False
