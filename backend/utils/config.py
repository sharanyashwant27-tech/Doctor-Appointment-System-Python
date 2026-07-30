"""Application settings (stub — W3/W4 will harden)."""
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    APP_NAME: str = "MediBook"
    ENVIRONMENT: str = "development"
    SECRET_KEY: str = "dev-secret-change-me"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    DATABASE_URL: str = "sqlite:///./medibook.db"
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_TASK_ALWAYS_EAGER: bool = True
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "noreply@medibook.local"
    # Twilio SMS (falls back to console logging when empty)
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM_NUMBER: str = ""
    TWILIO_WHATSAPP_FROM: str = ""
    FIREBASE_ENABLED: bool = False
    FIREBASE_CREDENTIALS_JSON: str = ""
    STRIPE_SECRET_KEY: str = ""
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    CORS_ORIGINS: str = "http://localhost:8905"
    # Default UPI collect (QR + upi:// intent). Override VPA via .env for real collections.
    PAYMENT_GATEWAY: str = "upi"
    UPI_VPA: str = "medibook@upi"
    UPI_PAYEE_NAME: str = "MediBook Clinic"
    REMINDER_HOURS_BEFORE: int = 24

    # Security
    CSRF_ENABLED: bool = True
    CSRF_TRUSTED_HOSTS: str = "localhost:8905,127.0.0.1:8905,localhost:8000,127.0.0.1:8000"
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_DEFAULT: str = "120/minute"
    RATE_LIMIT_AUTH: str = "10/minute"
    HTTPS_ENABLED: bool = False

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def csrf_trusted_hosts_list(self) -> List[str]:
        return [h.strip() for h in self.CSRF_TRUSTED_HOSTS.split(",") if h.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
