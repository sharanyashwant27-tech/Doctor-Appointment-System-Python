"""Pytest fixtures — isolated SQLite DB per test."""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Callable

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("CELERY_TASK_ALWAYS_EAGER", "true")
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("PAYMENT_GATEWAY", "mock")
os.environ.setdefault("CSRF_ENABLED", "false")
os.environ.setdefault("RATE_LIMIT_ENABLED", "false")
os.environ.setdefault("HTTPS_ENABLED", "false")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import models  # noqa: F401 — register metadata before create_all
from auth.security import hash_password
from database.base import Base
from database.session import get_db
from main import app as fastapi_app
from models.doctor import DoctorProfile
from models.patient import PatientProfile
from models.user import User, UserRole


@pytest.fixture()
def db_engine():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture()
def db_session(db_engine):
    TestingSessionLocal = sessionmaker(bind=db_engine, autocommit=False, autoflush=False)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(db_engine):
    TestingSessionLocal = sessionmaker(bind=db_engine, autocommit=False, autoflush=False)

    def _override():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    fastapi_app.dependency_overrides[get_db] = _override
    with TestClient(fastapi_app) as c:
        yield c
    fastapi_app.dependency_overrides.clear()


@pytest.fixture()
def make_user(db_session: Session) -> Callable[..., User]:
    def _make(
        *,
        email: str,
        password: str = "Passw0rd!",
        full_name: str = "Test User",
        role: UserRole = UserRole.patient,
        specialty: str = "General",
        consultation_fee: float = 500.0,
        is_verified: bool = True,
    ) -> User:
        user = User(
            email=email.lower(),
            hashed_password=hash_password(password),
            full_name=full_name,
            role=role,
            is_active=True,
        )
        db_session.add(user)
        db_session.flush()
        if role == UserRole.doctor:
            db_session.add(
                DoctorProfile(
                    user_id=user.id,
                    specialty=specialty,
                    consultation_fee=consultation_fee,
                    is_verified=is_verified,
                )
            )
        elif role == UserRole.patient:
            db_session.add(PatientProfile(user_id=user.id))
        db_session.commit()
        db_session.refresh(user)
        return user

    return _make


@pytest.fixture()
def auth_headers(client: TestClient) -> Callable[[str, str], dict[str, str]]:
    def _headers(email: str, password: str) -> dict[str, str]:
        login = client.post("/api/v1/auth/login", json={"email": email, "password": password})
        assert login.status_code == 200, login.text
        token = login.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    return _headers


@pytest.fixture()
def future_slot() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=3, hours=2)


@pytest.fixture()
def seed_roles(make_user):
    """Admin + doctor + two patients for workflow tests."""
    admin = make_user(email="admin@test.local", password="Admin@123", full_name="Admin", role=UserRole.admin)
    doctor = make_user(
        email="doctor@test.local",
        password="Doctor@123",
        full_name="Dr Test",
        role=UserRole.doctor,
        specialty="Cardiology",
        consultation_fee=750.0,
    )
    patient = make_user(
        email="patient@test.local",
        password="Patient@123",
        full_name="Pat Test",
        role=UserRole.patient,
    )
    patient2 = make_user(
        email="patient2@test.local",
        password="Patient@123",
        full_name="Pat Two",
        role=UserRole.patient,
    )
    return {
        "admin": admin,
        "doctor": doctor,
        "patient": patient,
        "patient2": patient2,
        "passwords": {
            "admin@test.local": "Admin@123",
            "doctor@test.local": "Doctor@123",
            "patient@test.local": "Patient@123",
            "patient2@test.local": "Patient@123",
        },
    }


@pytest.fixture()
def doctor_profile_id(db_session: Session, seed_roles) -> int:
    profile = db_session.query(DoctorProfile).filter(DoctorProfile.user_id == seed_roles["doctor"].id).one()
    return profile.id
