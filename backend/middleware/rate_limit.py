"""In-memory / Redis-ready rate limiting middleware for auth-sensitive paths."""
from __future__ import annotations

import time
from collections import defaultdict, deque
from threading import Lock
from typing import Deque

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from utils.config import settings

# path prefix -> max requests per window (seconds)
AUTH_PATHS = {
    "/api/login": None,
    "/api/register": None,
    "/api/forgot-password": None,
    "/api/v1/auth/login": None,
    "/api/v1/auth/register": None,
    "/api/v1/auth/refresh": None,
    "/api/v1/auth/forgot-password": None,
    "/api/v1/auth/reset-password": None,
}


def _parse_limit(spec: str) -> tuple[int, int]:
    """Parse '10/minute' -> (10, 60)."""
    count_s, _, period = spec.strip().lower().partition("/")
    count = int(count_s)
    period = period.strip()
    seconds = {"second": 1, "minute": 60, "hour": 3600, "day": 86400}.get(period, 60)
    return count, seconds


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app) -> None:  # type: ignore[no-untyped-def]
        super().__init__(app)
        self._hits: dict[str, Deque[float]] = defaultdict(deque)
        self._lock = Lock()
        self._auth_max, self._auth_window = _parse_limit(settings.RATE_LIMIT_AUTH)
        self._default_max, self._default_window = _parse_limit(settings.RATE_LIMIT_DEFAULT)

    def _client_key(self, request: Request) -> str:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        if request.client:
            return request.client.host or "unknown"
        return "unknown"

    def _allow(self, key: str, limit: int, window: int) -> bool:
        now = time.monotonic()
        with self._lock:
            q = self._hits[key]
            while q and now - q[0] > window:
                q.popleft()
            if len(q) >= limit:
                return False
            q.append(now)
            return True

    async def dispatch(self, request: Request, call_next) -> Response:
        if not settings.RATE_LIMIT_ENABLED:
            return await call_next(request)

        path = request.url.path.rstrip("/") or "/"
        # normalize without trailing slash for lookup
        candidates = {path, path + "/", request.url.path}

        is_auth = any(p.rstrip("/") in {c.rstrip("/") for c in candidates} for p in AUTH_PATHS)
        if is_auth and request.method.upper() == "POST":
            key = f"auth:{self._client_key(request)}:{path}"
            if not self._allow(key, self._auth_max, self._auth_window):
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Rate limit exceeded", "code": "rate_limit"},
                    headers={"Retry-After": str(self._auth_window)},
                )
        elif settings.RATE_LIMIT_DEFAULT and request.method.upper() != "OPTIONS":
            key = f"default:{self._client_key(request)}"
            if not self._allow(key, self._default_max, self._default_window):
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Rate limit exceeded", "code": "rate_limit"},
                    headers={"Retry-After": str(self._default_window)},
                )

        return await call_next(request)
