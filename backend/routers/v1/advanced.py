"""Advanced feature API routes."""
from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import Response

from api.deps import AdminUser, CurrentUser, DbSession, DoctorUser, PatientUser
from auth import auth_service
from schemas.advanced import (
    AssistantRequest,
    AttachBranchRequest,
    CertificateCreate,
    CertificateOut,
    ChatOpenRequest,
    ChatPostRequest,
    ClaimCreate,
    ClaimOut,
    ERxSignRequest,
    FacePayload,
    HospitalCreate,
    HospitalOut,
    InsurancePolicyCreate,
    MessageOut,
    OcrOut,
    OcrRequest,
    PolicyOut,
    RecommendRequest,
    ReminderCreate,
    ReminderOut,
    ReviewCreate,
    ReviewOut,
    SignRequest,
    SymptomCheckRequest,
    ThreadOut,
    VoiceBookRequest,
)
from schemas.auth import TokenPair
from schemas.common import Message
from services import advanced_service

router = APIRouter(prefix="/advanced", tags=["advanced"])


@router.post("/symptoms/check")
def symptoms_check(payload: SymptomCheckRequest, user: CurrentUser):
    return advanced_service.check_symptoms(payload.symptoms)


@router.post("/assistant/chat")
def assistant(payload: AssistantRequest, user: CurrentUser, db: DbSession):
    return advanced_service.assistant_chat(db, user, payload.message)


@router.post("/voice/parse")
def voice_parse(payload: VoiceBookRequest, user: CurrentUser):
    return advanced_service.parse_voice_booking(payload.transcript)


@router.post("/recommendations")
def recommendations(payload: RecommendRequest, user: CurrentUser, db: DbSession):
    return advanced_service.recommend_doctors(db, payload.symptoms, payload.city, payload.limit)


@router.post("/face/enroll", response_model=Message)
def face_enroll(payload: FacePayload, user: CurrentUser, db: DbSession):
    advanced_service.enroll_face(db, user, payload.image_b64)
    return Message(message="Face enrolled")


@router.post("/face/login", response_model=TokenPair)
def face_login(payload: FacePayload, db: DbSession):
    user = advanced_service.face_login(db, payload.image_b64)
    return auth_service.issue_tokens_for_user(db, user)


@router.post("/video/{appointment_id}/room")
def video_room(appointment_id: int, user: CurrentUser, db: DbSession):
    return advanced_service.video_room_for_appointment(db, user, appointment_id)


@router.get("/hospitals", response_model=list[HospitalOut])
def hospitals(db: DbSession, user: CurrentUser):
    return advanced_service.list_hospitals(db)


@router.post("/hospitals", response_model=HospitalOut, status_code=201)
def create_hospital(payload: HospitalCreate, user: AdminUser, db: DbSession):
    return advanced_service.create_hospital(
        db, name=payload.name, code=payload.code, city=payload.city, address=payload.address
    )


@router.post("/hospitals/attach-branch", response_model=Message)
def attach_branch(payload: AttachBranchRequest, user: AdminUser, db: DbSession):
    advanced_service.attach_branch_hospital(db, payload.branch_id, payload.hospital_id)
    return Message(message="Branch attached to hospital")


@router.post("/reviews", response_model=ReviewOut, status_code=201)
def create_review(payload: ReviewCreate, user: PatientUser, db: DbSession):
    return advanced_service.submit_review(
        db,
        user,
        doctor_id=payload.doctor_id,
        rating=payload.rating,
        comment=payload.comment,
        appointment_id=payload.appointment_id,
    )


@router.get("/reviews/{doctor_id}", response_model=list[ReviewOut])
def reviews(doctor_id: int, db: DbSession):
    return advanced_service.list_reviews(db, doctor_id)


@router.get("/chat/threads", response_model=list[ThreadOut])
def chat_threads(user: CurrentUser, db: DbSession):
    return advanced_service.list_threads(db, user)


@router.post("/chat/threads", response_model=ThreadOut, status_code=201)
def open_thread(payload: ChatOpenRequest, user: PatientUser, db: DbSession):
    return advanced_service.get_or_create_thread(db, user, payload.doctor_id, payload.appointment_id)


@router.get("/chat/threads/{thread_id}/messages", response_model=list[MessageOut])
def chat_messages(thread_id: int, user: CurrentUser, db: DbSession):
    return advanced_service.list_messages(db, user, thread_id)


@router.post("/chat/threads/{thread_id}/messages", response_model=MessageOut, status_code=201)
def post_message(thread_id: int, payload: ChatPostRequest, user: CurrentUser, db: DbSession):
    return advanced_service.post_chat(db, user, thread_id, payload.body)


@router.get("/reminders", response_model=list[ReminderOut])
def reminders(user: PatientUser, db: DbSession):
    return advanced_service.list_reminders(db, user)


@router.post("/reminders", response_model=ReminderOut, status_code=201)
def create_reminder(payload: ReminderCreate, user: PatientUser, db: DbSession):
    return advanced_service.create_reminder(
        db,
        user,
        medicine_name=payload.medicine_name,
        schedule_time=payload.schedule_time,
        dosage=payload.dosage,
        days_of_week=payload.days_of_week,
        notes=payload.notes,
    )


@router.get("/insurance/policies", response_model=list[PolicyOut])
def policies(user: PatientUser, db: DbSession):
    return advanced_service.list_policies(db, user)


@router.post("/insurance/policies", response_model=PolicyOut, status_code=201)
def add_policy(payload: InsurancePolicyCreate, user: PatientUser, db: DbSession):
    return advanced_service.add_insurance_policy(
        db,
        user,
        provider=payload.provider,
        policy_number=payload.policy_number,
        coverage_percent=payload.coverage_percent,
        valid_until=payload.valid_until,
    )


@router.post("/insurance/claims", response_model=ClaimOut, status_code=201)
def claim(payload: ClaimCreate, user: PatientUser, db: DbSession):
    return advanced_service.submit_claim(
        db,
        user,
        policy_id=payload.policy_id,
        amount=payload.amount,
        appointment_id=payload.appointment_id,
        notes=payload.notes,
    )


@router.post("/calendar/google/connect")
def google_connect(user: CurrentUser, db: DbSession):
    return advanced_service.connect_google_calendar(db, user)


@router.get("/calendar/export.ics")
def calendar_ics(user: CurrentUser, db: DbSession):
    ics = advanced_service.calendar_ics_for_user(db, user)
    return Response(content=ics, media_type="text/calendar", headers={"Content-Disposition": "attachment; filename=medibook.ics"})


@router.post("/signatures", response_model=Message)
def sign(payload: SignRequest, user: CurrentUser, db: DbSession):
    advanced_service.sign_entity(db, user, payload.entity_type, payload.entity_id, payload.signature_data)
    return Message(message="Signed")


@router.post("/certificates", response_model=CertificateOut, status_code=201)
def create_cert(payload: CertificateCreate, user: DoctorUser, db: DbSession):
    return advanced_service.create_certificate(
        db,
        user,
        patient_id=payload.patient_id,
        cert_type=payload.cert_type,
        diagnosis=payload.diagnosis,
        remarks=payload.remarks,
        valid_from=payload.valid_from,
        valid_until=payload.valid_until,
        appointment_id=payload.appointment_id,
    )


@router.get("/certificates/{cert_id}.pdf")
def cert_pdf(cert_id: int, user: CurrentUser, db: DbSession):
    pdf = advanced_service.certificate_pdf_bytes(db, cert_id)
    return Response(content=pdf, media_type="application/pdf", headers={"Content-Disposition": f"inline; filename=certificate-{cert_id}.pdf"})


@router.post("/ocr/scan", response_model=OcrOut, status_code=201)
def ocr(payload: OcrRequest, user: PatientUser, db: DbSession):
    return advanced_service.ocr_scan_report(db, user, payload.filename, payload.raw_text)


@router.post("/eprescription/{prescription_id}/bundle")
def erx_bundle(prescription_id: int, payload: ERxSignRequest, user: CurrentUser, db: DbSession):
    return advanced_service.eprescription_bundle(db, user, prescription_id, payload.signature_data)
