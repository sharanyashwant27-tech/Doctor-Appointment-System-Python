"""Centralized AppException hierarchy + FastAPI handler registration."""
from __future__ import annotations

from typing import Any, Optional

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class AppException(Exception):
    def __init__(
        self,
        message: str = "Application error",
        status_code: int = 400,
        code: str = "app_error",
        details: Optional[Any] = None,
    ) -> None:
        self.message = message
        self.status_code = status_code
        self.code = code
        self.details = details
        super().__init__(message)


class NotFoundError(AppException):
    def __init__(self, message: str = "Resource not found", **kwargs: Any) -> None:
        super().__init__(message=message, status_code=404, code="not_found", **kwargs)


class UnauthorizedError(AppException):
    def __init__(self, message: str = "Unauthorized", **kwargs: Any) -> None:
        super().__init__(message=message, status_code=401, code="unauthorized", **kwargs)


class ForbiddenError(AppException):
    def __init__(self, message: str = "Forbidden", **kwargs: Any) -> None:
        super().__init__(message=message, status_code=403, code="forbidden", **kwargs)


class ConflictError(AppException):
    def __init__(self, message: str = "Conflict", **kwargs: Any) -> None:
        super().__init__(message=message, status_code=409, code="conflict", **kwargs)


class ValidationAppError(AppException):
    def __init__(self, message: str = "Validation error", **kwargs: Any) -> None:
        super().__init__(message=message, status_code=422, code="validation_error", **kwargs)


class BadRequestError(AppException):
    def __init__(self, message: str = "Bad request", **kwargs: Any) -> None:
        super().__init__(message=message, status_code=400, code="bad_request", **kwargs)


class PaymentError(AppException):
    def __init__(self, message: str = "Payment failed", **kwargs: Any) -> None:
        super().__init__(message=message, status_code=402, code="payment_error", **kwargs)


def _error_body(code: str, message: str, details: Any = None) -> dict[str, Any]:
    return {"code": code, "message": message, "details": details}


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppException)
    async def app_exception_handler(_request: Request, exc: AppException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_body(exc.code, exc.message, exc.details),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        _request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content=_error_body("validation_error", "Request validation failed", exc.errors()),
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(_request: Request, exc: StarletteHTTPException) -> JSONResponse:
        detail = exc.detail
        message = detail if isinstance(detail, str) else "HTTP error"
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_body("http_error", message, detail if not isinstance(detail, str) else None),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
        from middleware.logging import get_logger
        from utils.config import settings

        get_logger("medibook.errors").exception("Unhandled error: %s", exc)
        details = None
        if settings.ENVIRONMENT != "production":
            details = {"error": type(exc).__name__, "message": str(exc)}
        return JSONResponse(
            status_code=500,
            content=_error_body("internal_error", "Internal server error", details),
        )
