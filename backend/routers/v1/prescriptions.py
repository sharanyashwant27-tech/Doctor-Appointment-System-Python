"""Prescription PDF API."""
from io import BytesIO

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from api.deps import CurrentUser, DbSession
from services import prescription_service

router = APIRouter(prefix="/prescriptions", tags=["prescriptions"])


@router.get("/{prescription_id}/pdf")
def prescription_pdf(prescription_id: int, user: CurrentUser, db: DbSession):
    pdf = prescription_service.get_prescription_pdf(db, user, prescription_id)
    return StreamingResponse(
        BytesIO(pdf),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="prescription-{prescription_id}.pdf"'},
    )
