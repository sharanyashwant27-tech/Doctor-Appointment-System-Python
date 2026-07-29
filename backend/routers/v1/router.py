"""Aggregate v1 API router."""
from fastapi import APIRouter

from routers.v1 import (
    admin,
    advanced,
    appointments,
    auth,
    doctors,
    medical_records,
    modules,
    notifications,
    patients,
    payments,
    prescriptions,
    users,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(doctors.router)
api_router.include_router(patients.router)
api_router.include_router(appointments.router)
api_router.include_router(medical_records.router)
api_router.include_router(payments.router)
api_router.include_router(notifications.router)
api_router.include_router(prescriptions.router)
api_router.include_router(admin.router)
api_router.include_router(modules.router)
api_router.include_router(advanced.router)
