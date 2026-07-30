"""Advanced MediBook features — rule-based AI demos + clinical tooling."""
from __future__ import annotations

import hashlib
import re
import secrets
import uuid
from datetime import date, datetime, time, timedelta, timezone
from typing import Any, Optional
from urllib.parse import quote

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from models.advanced import (
    CalendarSyncToken,
    ChatMessage,
    ChatThread,
    DigitalSignature,
    DoctorReview,
    FaceCredential,
    HealthAssistantMessage,
    Hospital,
    InsuranceClaim,
    InsurancePolicy,
    MedicalCertificate,
    MedicineReminder,
    OcrScan,
)
from models.appointment import Appointment, AppointmentStatus
from models.doctor import DoctorProfile
from models.org import Branch
from models.patient import PatientProfile
from models.user import User, UserRole
from reports.pdf_service import build_medical_certificate_pdf, build_prescription_pdf
from utils.exceptions import BadRequestError, ForbiddenError, NotFoundError

# ── Symptom / specialty mapping (demo AI) ─────────────────────────────────────

SYMPTOM_MAP: list[tuple[list[str], str, str, int]] = [
    (["chest", "heart", "palpitation", "bp", "blood pressure"], "Cardiology", "Possible cardiac concern — seek urgent care if severe.", 4),
    (["skin", "rash", "acne", "itch", "dermat"], "Dermatology", "Likely dermatology evaluation.", 2),
    (["fever", "cough", "cold", "flu", "throat"], "General Medicine", "Viral illness pattern — rest and hydrate.", 2),
    (["headache", "migraine", "dizziness", "neuro"], "Neurology", "Neurological symptoms — monitor severity.", 3),
    (["joint", "bone", "fracture", "ortho", "knee", "back pain"], "Orthopedics", "Musculoskeletal issue — imaging may help.", 2),
    (["child", "pediatric", "baby", "infant"], "Pediatrics", "Pediatric assessment recommended.", 2),
    (["eye", "vision", "blurry"], "Ophthalmology", "Eye specialist recommended.", 2),
    (["anxiety", "depression", "stress", "sleep"], "Psychiatry", "Mental health support may help.", 2),
    (["stomach", "abdominal", "nausea", "diarrhea", "gi"], "Gastroenterology", "GI evaluation suggested.", 2),
]


def check_symptoms(symptoms: str) -> dict[str, Any]:
    text = (symptoms or "").lower()
    matches: list[dict[str, Any]] = []
    for keys, specialty, advice, urgency in SYMPTOM_MAP:
        hits = [k for k in keys if k in text]
        if hits:
            matches.append(
                {
                    "specialty": specialty,
                    "matched_terms": hits,
                    "advice": advice,
                    "urgency": urgency,
                    "confidence": min(0.95, 0.45 + 0.15 * len(hits)),
                }
            )
    if not matches:
        matches.append(
            {
                "specialty": "General Medicine",
                "matched_terms": [],
                "advice": "No strong specialty signal — start with a general physician.",
                "urgency": 1,
                "confidence": 0.4,
            }
        )
    matches.sort(key=lambda m: (-m["urgency"], -m["confidence"]))
    return {
        "input": symptoms,
        "primary": matches[0],
        "suggestions": matches[:4],
        "disclaimer": "Demo triage only — not a medical diagnosis. Seek emergency care for severe symptoms.",
        "engine": "medibook-rules-v1",
    }


def health_assistant_reply(message: str) -> str:
    checked = check_symptoms(message)
    primary = checked["primary"]
    lower = message.lower()
    if any(w in lower for w in ("hello", "hi", "hey")):
        return (
            "Hello — I'm the MediBook Health Assistant. Describe symptoms, medicines, or ask about booking. "
            "I provide educational guidance only."
        )
    if "medicine" in lower or "dose" in lower:
        return (
            "Take medicines exactly as prescribed. Set reminders under Medicine Reminders. "
            "Never change dose without your doctor. For side effects, contact your clinician."
        )
    if "book" in lower or "appointment" in lower:
        return (
            f"Based on what you shared, consider **{primary['specialty']}**. "
            "Use Smart Recommendations or Find Doctors to book. For voice booking, open Voice Booking."
        )
    return (
        f"I mapped your note toward **{primary['specialty']}** (confidence {primary['confidence']:.0%}). "
        f"{primary['advice']} {checked['disclaimer']}"
    )


# ── Helpers ───────────────────────────────────────────────────────────────────


def _patient(db: Session, user: User) -> PatientProfile:
    p = db.scalar(select(PatientProfile).where(PatientProfile.user_id == user.id))
    if not p:
        raise ForbiddenError("Patient profile required")
    return p


def _doctor(db: Session, user: User) -> DoctorProfile:
    d = db.scalar(select(DoctorProfile).where(DoctorProfile.user_id == user.id))
    if not d:
        raise ForbiddenError("Doctor profile required")
    return d


def face_fingerprint(image_b64: str) -> str:
    """Demo face hash from image/descriptor payload (not biometric ML)."""
    raw = (image_b64 or "").strip().encode("utf-8")
    if len(raw) < 32:
        raise BadRequestError("Face sample too short")
    return hashlib.sha256(raw).hexdigest()


# ── Public service API ────────────────────────────────────────────────────────


def enroll_face(db: Session, user: User, image_b64: str) -> dict[str, Any]:
    face_hash = face_fingerprint(image_b64)
    row = db.scalar(select(FaceCredential).where(FaceCredential.user_id == user.id))
    if row:
        row.face_hash = face_hash
        row.enrolled_at = datetime.now(timezone.utc)
    else:
        row = FaceCredential(user_id=user.id, face_hash=face_hash)
        db.add(row)
    db.commit()
    return {"enrolled": True, "user_id": user.id}


def face_login(db: Session, image_b64: str) -> User:
    face_hash = face_fingerprint(image_b64)
    cred = db.scalar(select(FaceCredential).where(FaceCredential.face_hash == face_hash))
    if not cred:
        raise BadRequestError("Face not recognized")
    user = db.get(User, cred.user_id)
    if not user or not user.is_active:
        raise BadRequestError("Account inactive")
    return user


def recommend_doctors(db: Session, symptoms: str = "", city: Optional[str] = None, limit: int = 5) -> list[dict]:
    triage = check_symptoms(symptoms) if symptoms else None
    specialty = triage["primary"]["specialty"] if triage else None
    q = select(DoctorProfile).where(DoctorProfile.is_verified.is_(True))
    if city:
        q = q.where(DoctorProfile.city.ilike(f"%{city}%"))
    doctors = list(db.scalars(q).all())
    scored: list[tuple[float, DoctorProfile]] = []
    for d in doctors:
        score = float(d.rating_avg or 0) * 10
        if specialty and specialty.lower() in (d.specialty or "").lower():
            score += 40
        elif specialty and any(w in (d.specialty or "").lower() for w in specialty.lower().split()):
            score += 20
        score += max(0, 15 - float(d.consultation_fee or 0) / 200)
        scored.append((score, d))
    scored.sort(key=lambda x: -x[0])
    out = []
    for score, d in scored[:limit]:
        name = d.user.full_name if d.user else None
        out.append(
            {
                "doctor_id": d.id,
                "full_name": name,
                "specialty": d.specialty,
                "rating_avg": d.rating_avg,
                "consultation_fee": d.consultation_fee,
                "city": d.city,
                "score": round(score, 2),
                "reason": f"Matched {specialty or 'general preference'} · rating {d.rating_avg}",
            }
        )
    return out


def parse_voice_booking(transcript: str) -> dict[str, Any]:
    text = transcript or ""
    specialty = check_symptoms(text)["primary"]["specialty"]
    when = None
    m = re.search(
        r"(tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|"
        r"\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)",
        text,
        re.I,
    )
    if m:
        token = m.group(1).lower()
        now = datetime.now(timezone.utc)
        if token == "today":
            when = (now + timedelta(hours=3)).isoformat()
        elif token == "tomorrow":
            when = (now + timedelta(days=1)).replace(hour=10, minute=0).isoformat()
        else:
            when = (now + timedelta(days=2)).replace(hour=10, minute=0).isoformat()
    doctor_hint = None
    dm = re.search(r"dr\.?\s+([a-z]+)", text, re.I)
    if dm:
        doctor_hint = dm.group(1)
    return {
        "transcript": text,
        "suggested_specialty": specialty,
        "suggested_datetime": when,
        "doctor_name_hint": doctor_hint,
        "next_step": "Confirm a doctor from recommendations and call POST /appointments",
    }


def video_room_for_appointment(db: Session, user: User, appointment_id: int) -> dict[str, Any]:
    appt = db.get(Appointment, appointment_id)
    if not appt:
        raise NotFoundError("Appointment not found")
    # authorize lightly
    role = user.role.value if isinstance(user.role, UserRole) else str(user.role)
    if role == "patient":
        p = _patient(db, user)
        if appt.patient_id != p.id:
            raise ForbiddenError("Not your appointment")
    elif role == "doctor":
        d = _doctor(db, user)
        if appt.doctor_id != d.id:
            raise ForbiddenError("Not your appointment")
    room = f"medibook-{appt.id}-{appt.qr_token or secrets.token_hex(4)}"
    # Public Jitsi — works without API keys
    url = f"https://meet.jit.si/{quote(room)}"
    appt.meeting_url = url
    if not appt.consultation_mode or appt.consultation_mode == "in_person":
        appt.consultation_mode = "online"
    db.commit()
    return {"appointment_id": appt.id, "room": room, "meeting_url": url, "provider": "jitsi"}


def list_hospitals(db: Session) -> list[Hospital]:
    return list(db.scalars(select(Hospital).where(Hospital.is_active.is_(True)).order_by(Hospital.name)).all())


def create_hospital(db: Session, *, name: str, code: str, city: str | None = None, address: str | None = None) -> Hospital:
    row = Hospital(name=name, code=code.upper(), city=city, address=address)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def attach_branch_hospital(db: Session, branch_id: int, hospital_id: int) -> Branch:
    branch = db.get(Branch, branch_id)
    hospital = db.get(Hospital, hospital_id)
    if not branch or not hospital:
        raise NotFoundError("Branch or hospital not found")
    branch.hospital_id = hospital_id
    db.commit()
    db.refresh(branch)
    return branch


def submit_review(
    db: Session,
    user: User,
    *,
    doctor_id: int,
    rating: int,
    comment: str | None = None,
    appointment_id: int | None = None,
) -> DoctorReview:
    if rating < 1 or rating > 5:
        raise BadRequestError("Rating must be 1-5")
    patient = _patient(db, user)
    doc = db.get(DoctorProfile, doctor_id)
    if not doc:
        raise NotFoundError("Doctor not found")
    row = DoctorReview(
        doctor_id=doctor_id,
        patient_id=patient.id,
        appointment_id=appointment_id,
        rating=rating,
        comment=comment,
    )
    db.add(row)
    db.flush()
    avg = db.scalar(select(func.avg(DoctorReview.rating)).where(DoctorReview.doctor_id == doctor_id))
    doc.rating_avg = round(float(avg or rating), 2)
    db.commit()
    db.refresh(row)
    return row


def list_reviews(db: Session, doctor_id: int) -> list[DoctorReview]:
    return list(
        db.scalars(
            select(DoctorReview).where(DoctorReview.doctor_id == doctor_id).order_by(DoctorReview.created_at.desc())
        ).all()
    )


def get_or_create_thread(db: Session, user: User, doctor_id: int, appointment_id: int | None = None) -> ChatThread:
    patient = _patient(db, user)
    thread = db.scalar(
        select(ChatThread).where(
            ChatThread.patient_id == patient.id,
            ChatThread.doctor_id == doctor_id,
            ChatThread.is_active.is_(True),
        )
    )
    if not thread:
        thread = ChatThread(
            patient_id=patient.id,
            doctor_id=doctor_id,
            appointment_id=appointment_id,
            subject="Consultation chat",
        )
        db.add(thread)
        db.commit()
        db.refresh(thread)
    return thread


def list_threads(db: Session, user: User) -> list[ChatThread]:
    role = user.role.value if isinstance(user.role, UserRole) else str(user.role)
    if role == "patient":
        p = _patient(db, user)
        return list(db.scalars(select(ChatThread).where(ChatThread.patient_id == p.id)).all())
    if role == "doctor":
        d = _doctor(db, user)
        return list(db.scalars(select(ChatThread).where(ChatThread.doctor_id == d.id)).all())
    return list(db.scalars(select(ChatThread).limit(50)).all())


def post_chat(db: Session, user: User, thread_id: int, body: str) -> ChatMessage:
    thread = db.get(ChatThread, thread_id)
    if not thread:
        raise NotFoundError("Thread not found")
    role = user.role.value if isinstance(user.role, UserRole) else str(user.role)
    if role == "patient":
        if thread.patient_id != _patient(db, user).id:
            raise ForbiddenError("Not your thread")
    elif role == "doctor":
        if thread.doctor_id != _doctor(db, user).id:
            raise ForbiddenError("Not your thread")
    msg = ChatMessage(thread_id=thread_id, sender_user_id=user.id, body=body.strip())
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


def list_messages(db: Session, user: User, thread_id: int) -> list[ChatMessage]:
    thread = db.get(ChatThread, thread_id)
    if not thread:
        raise NotFoundError("Thread not found")
    return list(
        db.scalars(select(ChatMessage).where(ChatMessage.thread_id == thread_id).order_by(ChatMessage.created_at)).all()
    )


def create_reminder(
    db: Session,
    user: User,
    *,
    medicine_name: str,
    schedule_time: time,
    dosage: str | None = None,
    days_of_week: str = "0,1,2,3,4,5,6",
    notes: str | None = None,
) -> MedicineReminder:
    patient = _patient(db, user)
    row = MedicineReminder(
        patient_id=patient.id,
        medicine_name=medicine_name,
        dosage=dosage,
        schedule_time=schedule_time,
        days_of_week=days_of_week,
        notes=notes,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_reminders(db: Session, user: User) -> list[MedicineReminder]:
    patient = _patient(db, user)
    return list(
        db.scalars(
            select(MedicineReminder).where(MedicineReminder.patient_id == patient.id, MedicineReminder.is_active.is_(True))
        ).all()
    )


def add_insurance_policy(
    db: Session,
    user: User,
    *,
    provider: str,
    policy_number: str,
    coverage_percent: float = 80.0,
    valid_until: date | None = None,
) -> InsurancePolicy:
    patient = _patient(db, user)
    row = InsurancePolicy(
        patient_id=patient.id,
        provider=provider,
        policy_number=policy_number,
        coverage_percent=coverage_percent,
        valid_until=valid_until,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_policies(db: Session, user: User) -> list[InsurancePolicy]:
    patient = _patient(db, user)
    return list(db.scalars(select(InsurancePolicy).where(InsurancePolicy.patient_id == patient.id)).all())


def submit_claim(
    db: Session,
    user: User,
    *,
    policy_id: int,
    amount: float,
    appointment_id: int | None = None,
    notes: str | None = None,
) -> InsuranceClaim:
    patient = _patient(db, user)
    policy = db.get(InsurancePolicy, policy_id)
    if not policy or policy.patient_id != patient.id:
        raise NotFoundError("Policy not found")
    covered = round(amount * (policy.coverage_percent / 100.0), 2)
    row = InsuranceClaim(
        policy_id=policy_id,
        appointment_id=appointment_id,
        amount=amount,
        status="approved",
        claim_ref=f"CLM-{uuid.uuid4().hex[:8].upper()}",
        notes=notes or f"Demo auto-approved cover ₹{covered}",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def connect_google_calendar(db: Session, user: User) -> dict[str, Any]:
    """Mark calendar sync as connected and return ICS-based import steps.

    Real Google OAuth needs a Cloud Console client id/secret. Until those are
    configured we sync via .ics download + Google Calendar Import (no OAuth popup).
    """
    row = db.scalar(select(CalendarSyncToken).where(CalendarSyncToken.user_id == user.id))
    if not row:
        row = CalendarSyncToken(user_id=user.id)
        db.add(row)
    row.connected = True
    row.access_token = f"demo-token-{secrets.token_hex(8)}"
    row.calendar_id = "primary"
    row.provider = "google"
    db.commit()
    return {
        "connected": True,
        "provider": "google",
        "demo": True,
        "sync_method": "ics",
        # Never return accounts.google.com/o/oauth2 — DEMO client_id is blocked by Google.
        "auth_url": None,
        "google_calendar_url": "https://calendar.google.com/calendar/u/0/r/settings/export",
        "ics_path": "/api/v1/advanced/calendar/export.ics",
        "message": (
            "Calendar linked. Download your MediBook .ics file, then in Google Calendar "
            "open Settings → Import & export → Import, and choose medibook.ics."
        ),
    }


def calendar_status(db: Session, user: User) -> dict[str, Any]:
    row = db.scalar(select(CalendarSyncToken).where(CalendarSyncToken.user_id == user.id))
    if not row or not row.connected:
        return {"connected": False, "provider": None, "sync_method": "ics"}
    return {
        "connected": True,
        "provider": row.provider or "google",
        "calendar_id": row.calendar_id,
        "sync_method": "ics",
        "google_calendar_url": "https://calendar.google.com/calendar/u/0/r/settings/export",
        "ics_path": "/api/v1/advanced/calendar/export.ics",
    }


def calendar_ics_for_user(db: Session, user: User) -> str:
    role = user.role.value if isinstance(user.role, UserRole) else str(user.role)
    appts: list[Appointment] = []
    if role == "patient":
        p = _patient(db, user)
        appts = list(db.scalars(select(Appointment).where(Appointment.patient_id == p.id).limit(50)).all())
    elif role == "doctor":
        d = _doctor(db, user)
        appts = list(db.scalars(select(Appointment).where(Appointment.doctor_id == d.id).limit(50)).all())
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//MediBook//EN",
        "CALSCALE:GREGORIAN",
    ]
    for a in appts:
        start = a.scheduled_at
        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)
        end = start + timedelta(minutes=a.duration_minutes or 30)
        uid = f"appt-{a.id}@medibook.local"
        lines.extend(
            [
                "BEGIN:VEVENT",
                f"UID:{uid}",
                f"DTSTART:{start.strftime('%Y%m%dT%H%M%SZ')}",
                f"DTEND:{end.strftime('%Y%m%dT%H%M%SZ')}",
                f"SUMMARY:MediBook appointment #{a.id}",
                f"DESCRIPTION:{a.reason or 'Consultation'}",
                "END:VEVENT",
            ]
        )
    lines.append("END:VCALENDAR")
    return "\r\n".join(lines)


def sign_entity(db: Session, user: User, entity_type: str, entity_id: int, signature_data: str) -> DigitalSignature:
    if not signature_data or len(signature_data) < 10:
        raise BadRequestError("Signature required")
    row = DigitalSignature(
        user_id=user.id,
        entity_type=entity_type,
        entity_id=entity_id,
        signature_data=signature_data,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def create_certificate(
    db: Session,
    user: User,
    *,
    patient_id: int,
    cert_type: str = "fitness",
    diagnosis: str | None = None,
    remarks: str | None = None,
    valid_from: date | None = None,
    valid_until: date | None = None,
    appointment_id: int | None = None,
) -> MedicalCertificate:
    doctor = _doctor(db, user)
    row = MedicalCertificate(
        patient_id=patient_id,
        doctor_id=doctor.id,
        appointment_id=appointment_id,
        cert_type=cert_type,
        diagnosis=diagnosis,
        remarks=remarks,
        valid_from=valid_from or date.today(),
        valid_until=valid_until or (date.today() + timedelta(days=7)),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def certificate_pdf_bytes(db: Session, cert_id: int) -> bytes:
    cert = db.get(MedicalCertificate, cert_id)
    if not cert:
        raise NotFoundError("Certificate not found")
    patient = db.get(PatientProfile, cert.patient_id)
    doctor = db.get(DoctorProfile, cert.doctor_id)
    patient_name = patient.user.full_name if patient and patient.user else "Patient"
    doctor_name = doctor.user.full_name if doctor and doctor.user else "Doctor"
    return build_medical_certificate_pdf(
        patient_name=patient_name,
        doctor_name=doctor_name,
        cert_type=cert.cert_type,
        diagnosis=cert.diagnosis or "",
        remarks=cert.remarks or "",
        valid_from=cert.valid_from,
        valid_until=cert.valid_until,
    )


def ocr_scan_report(db: Session, user: User, filename: str, raw_text: str | None = None) -> OcrScan:
    patient = _patient(db, user)
    text = raw_text or ""
    if not text:
        # Demo OCR from filename heuristics
        text = (
            f"MediBook OCR demo extract from {filename}\n"
            "Hemoglobin: 13.2 g/dL\nWBC: 7.1 x10^9/L\nGlucose fasting: 98 mg/dL\n"
            "Impression: Within normal limits."
        )
    findings: dict[str, Any] = {"labs": {}}
    for label, pattern in [
        ("hemoglobin", r"hemoglobin[:\s]+([\d.]+)"),
        ("wbc", r"wbc[:\s]+([\d.]+)"),
        ("glucose", r"glucose[^:]*[:\s]+([\d.]+)"),
    ]:
        m = re.search(pattern, text, re.I)
        if m:
            findings["labs"][label] = m.group(1)
    findings["impression"] = "normal" if "normal" in text.lower() else "review"
    row = OcrScan(patient_id=patient.id, filename=filename, extracted_text=text, findings=findings)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def assistant_chat(db: Session, user: User, message: str) -> dict[str, Any]:
    db.add(HealthAssistantMessage(user_id=user.id, role="user", content=message))
    reply = health_assistant_reply(message)
    db.add(HealthAssistantMessage(user_id=user.id, role="assistant", content=reply))
    db.commit()
    return {"reply": reply, "triage": check_symptoms(message)}


def eprescription_bundle(db: Session, user: User, prescription_id: int, signature_data: str | None = None) -> dict[str, Any]:
    from models.prescription import Prescription

    rx = db.get(Prescription, prescription_id)
    if not rx:
        raise NotFoundError("Prescription not found")
    if signature_data:
        sign_entity(db, user, "prescription", prescription_id, signature_data)
    patient = db.get(PatientProfile, rx.patient_id) if rx.patient_id else None
    doctor = db.get(DoctorProfile, rx.doctor_id) if rx.doctor_id else None
    patient_name = patient.user.full_name if patient and patient.user else "Patient"
    doctor_name = doctor.user.full_name if doctor and doctor.user else "Doctor"
    meds = rx.medicines or []
    if not meds and rx.medicine:
        meds = [{"name": rx.medicine, "dose": rx.dosage or "", "frequency": "", "duration": ""}]
    pdf = build_prescription_pdf(
        patient_name=patient_name,
        doctor_name=doctor_name,
        medicines=meds,
        instructions=(rx.instructions or "") + ("\n\n[Digitally signed]" if signature_data else ""),
        diagnosis="",
    )
    return {
        "prescription_id": prescription_id,
        "signed": bool(signature_data),
        "pdf_base64": __import__("base64").b64encode(pdf).decode("ascii"),
        "patient_name": patient_name,
        "doctor_name": doctor_name,
        "medicines": meds,
    }
