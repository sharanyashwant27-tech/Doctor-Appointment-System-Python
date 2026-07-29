"""MediBook FastAPI application entrypoint."""
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from routers.v1.router import api_router
from routers.public_router import router as public_router
from utils.config import settings
from utils.exceptions import register_exception_handlers
from middleware.csrf import CsrfMiddleware, attach_csrf_cookie, issue_csrf_token
from middleware.logging import RequestLoggingMiddleware, get_logger, setup_logging
from middleware.rate_limit import RateLimitMiddleware
from middleware.security_headers import SecurityHeadersMiddleware
from database.base import Base
from database.session import SessionLocal, engine
import models  # noqa: F401 — register models on metadata

setup_logging()
logger = get_logger(__name__)

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description=(
        "MediBook Doctor Appointment System API.\n\n"
        "**Public REST design** under `/api/...` (register, login, doctors, patients, appointments, payment).\n"
        "**Extended API** under `/api/v1/...` (RBAC modules, prescriptions, analytics, 2FA, etc.).\n\n"
        "Security: JWT + bcrypt, RBAC, CSRF origin/token checks, rate limiting, audit logs, HTTPS-ready headers."
    ),
)

# Middleware order: last added runs first on request
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(CsrfMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list or ["http://localhost:8905"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-CSRF-Token", "X-Request-ID"],
)

register_exception_handlers(app)
app.include_router(public_router)
app.include_router(api_router)


@app.get("/health", tags=["health"])
async def health() -> dict:
    return {"status": "ok", "app": settings.APP_NAME}


@app.get("/ready", tags=["health"])
async def ready() -> dict:
    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
        return {"status": "ready", "database": "ok"}
    except Exception as exc:  # noqa: BLE001
        return {"status": "not_ready", "database": str(exc)}


@app.get("/api/v1/security/csrf", tags=["security"])
async def get_csrf_token(response: Response) -> dict:
    """Issue a double-submit CSRF cookie + token for browser clients."""
    token = attach_csrf_cookie(response, issue_csrf_token())
    response.headers["X-CSRF-Token"] = token
    return {"csrf_token": token}


@app.on_event("startup")
async def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    logger.info("%s starting (env=%s db=%s)", settings.APP_NAME, settings.ENVIRONMENT, settings.DATABASE_URL.split("://")[0])
