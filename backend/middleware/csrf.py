"""CSRF protection via Origin/Referer checks + double-submit cookie token."""
from __future__ import annotations

import secrets
from urllib.parse import urlparse

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from utils.config import settings

SAFE_METHODS = {"GET", "HEAD", "OPTIONS", "TRACE"}
CSRF_COOKIE = "medibook_csrf"
CSRF_HEADER = "X-CSRF-Token"
SKIP_PREFIXES = (
    "/health",
    "/ready",
    "/docs",
    "/redoc",
    "/openapi.json",
)


def _origin_host(value: str | None) -> str | None:
    if not value:
        return None
    parsed = urlparse(value if "://" in value else f"https://{value}")
    if not parsed.netloc:
        return None
    return parsed.netloc.lower()


def allowed_hosts() -> set[str]:
    hosts: set[str] = set()
    for origin in settings.cors_origins_list:
        host = _origin_host(origin)
        if host:
            hosts.add(host)
    for extra in settings.csrf_trusted_hosts_list:
        hosts.add(extra.lower())
    # Always allow same-host API clients without Origin (non-browser)
    return hosts


def issue_csrf_token() -> str:
    return secrets.token_urlsafe(32)


class CsrfMiddleware(BaseHTTPMiddleware):
    """
    Protects browser state-changing requests.

    1. Origin/Referer must match CORS allowlist when present (browser CSRF).
    2. If a CSRF cookie is present, require matching X-CSRF-Token header (double-submit).
    Bearer JWT APIs are already CSRF-resistant; this hardens cookie/session and browser POSTs.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        if not settings.CSRF_ENABLED:
            return await call_next(request)

        path = request.url.path
        if any(path == p or path.startswith(p + "/") for p in SKIP_PREFIXES):
            return await call_next(request)

        if request.method in SAFE_METHODS:
            return await call_next(request)

        # Browser Origin / Referer check
        origin = request.headers.get("origin")
        referer = request.headers.get("referer")
        if origin or referer:
            host = _origin_host(origin) or _origin_host(referer)
            if host and host not in allowed_hosts():
                return JSONResponse(
                    status_code=403,
                    content={"detail": "CSRF origin rejected", "code": "csrf_origin"},
                )

        # Double-submit when cookie was issued
        cookie_token = request.cookies.get(CSRF_COOKIE)
        if cookie_token:
            header_token = request.headers.get(CSRF_HEADER) or request.headers.get(CSRF_HEADER.lower())
            if not header_token or not secrets.compare_digest(cookie_token, header_token):
                return JSONResponse(
                    status_code=403,
                    content={"detail": "CSRF token missing or invalid", "code": "csrf_token"},
                )

        return await call_next(request)


def attach_csrf_cookie(response: Response, token: str | None = None) -> str:
    value = token or issue_csrf_token()
    response.set_cookie(
        key=CSRF_COOKIE,
        value=value,
        httponly=False,  # readable by JS for double-submit header
        samesite="lax",
        secure=settings.ENVIRONMENT == "production",
        max_age=60 * 60 * 8,
        path="/",
    )
    return value
