"""Optional Firebase Cloud Messaging (FCM) push notifications."""
from __future__ import annotations

from typing import Any, Mapping, Optional

from utils.config import settings
from middleware.logging import get_logger

logger = get_logger(__name__)

_firebase_ready: bool | None = None


def _ensure_firebase() -> bool:
    """Initialize firebase-admin once when credentials are present."""
    global _firebase_ready
    if _firebase_ready is not None:
        return _firebase_ready

    if not settings.FIREBASE_ENABLED:
        _firebase_ready = False
        return False

    cred_path = (settings.FIREBASE_CREDENTIALS_JSON or "").strip()
    if not cred_path:
        logger.warning("FIREBASE_ENABLED but FIREBASE_CREDENTIALS_JSON is empty")
        _firebase_ready = False
        return False

    try:
        import firebase_admin
        from firebase_admin import credentials

        if not firebase_admin._apps:  # type: ignore[attr-defined]
            firebase_admin.initialize_app(credentials.Certificate(cred_path))
        _firebase_ready = True
        logger.info("Firebase Admin initialized")
        return True
    except Exception as exc:  # noqa: BLE001
        logger.exception("Firebase init failed: %s", exc)
        _firebase_ready = False
        return False


def send_push(
    device_token: str,
    title: str,
    body: str,
    data: Optional[Mapping[str, str]] = None,
) -> bool:
    """
    Send an FCM push notification.

    Returns False when Firebase is disabled/unconfigured or the send fails.
    In development without Firebase, logs a console stub and returns True.
    """
    if not device_token:
        return False

    if not settings.FIREBASE_ENABLED:
        logger.info("[push:console] token=%s title=%s body=%s data=%s", device_token[:12], title, body, data)
        return True

    if not _ensure_firebase():
        return False

    try:
        from firebase_admin import messaging

        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            data=dict(data or {}),
            token=device_token,
        )
        message_id = messaging.send(message)
        logger.info("Push sent message_id=%s", message_id)
        return True
    except Exception as exc:  # noqa: BLE001
        logger.exception("Push send failed: %s", exc)
        return False


def send_push_multicast(
    tokens: list[str],
    title: str,
    body: str,
    data: Optional[Mapping[str, Any]] = None,
) -> int:
    """Send to multiple tokens; returns success count (console stub counts all when disabled)."""
    tokens = [t for t in tokens if t]
    if not tokens:
        return 0
    if not settings.FIREBASE_ENABLED:
        for t in tokens:
            send_push(t, title, body, {str(k): str(v) for k, v in (data or {}).items()})
        return len(tokens)
    ok = 0
    payload = {str(k): str(v) for k, v in (data or {}).items()}
    for token in tokens:
        if send_push(token, title, body, payload):
            ok += 1
    return ok
