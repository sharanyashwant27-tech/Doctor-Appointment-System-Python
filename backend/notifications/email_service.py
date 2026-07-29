"""SMTP email with console fallback in development."""
from __future__ import annotations

import asyncio
import smtplib
from email.message import EmailMessage

from utils.config import settings
from middleware.logging import get_logger

logger = get_logger(__name__)


def send_email(to: str, subject: str, body: str) -> bool:
    """Send email synchronously; falls back to logging when SMTP not configured."""
    if not settings.SMTP_HOST:
        logger.info("[email:console] to=%s subject=%s\n%s", to, subject, body)
        return True

    msg = EmailMessage()
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as smtp:
            smtp.starttls()
            if settings.SMTP_USER:
                smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            smtp.send_message(msg)
        logger.info("Email sent to=%s subject=%s", to, subject)
        return True
    except Exception as exc:  # noqa: BLE001
        logger.exception("Email send failed to=%s: %s", to, exc)
        return False


async def send_email_async(to: str, subject: str, body: str) -> bool:
    return await asyncio.to_thread(send_email, to, subject, body)
