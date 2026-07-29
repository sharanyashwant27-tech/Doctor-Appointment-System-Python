"""Seed demo accounts and sample clinical/payment data."""
from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import select

from middleware.logging import get_logger, setup_logging
from auth.security import hash_password
from database.base import Base
from database.session import SessionLocal, engine
from models import (  # noqa: F401 — register metadata
    Appointment,
    AppointmentStatus,
    AuditLog,
    Availability,
    DoctorProfile,
    MedicalRecord,
    Notification,
    PatientProfile,
    Payment,
    PaymentStatus,
    Prescription,
    User,
    UserRole,
)
from models.appointment import PaymentStatusOnAppointment

setup_logging()
logger = get_logger(__name__)

# Password for all seeded doctors: Doctor@123
SEED_DOCTORS = [
    # Cardiology
    {"email": "doctor1@medibook.local", "full_name": "Dr. Anita Sharma", "specialty": "Cardiology", "city": "Mumbai", "fee": 1200.0, "years": 14, "qualification": "DM Cardiology"},
    {"email": "cardio2@medibook.local", "full_name": "Dr. Vikram Kapoor", "specialty": "Cardiology", "city": "Delhi", "fee": 1400.0, "years": 18, "qualification": "MD, DM Cardiology"},
    {"email": "cardio3@medibook.local", "full_name": "Dr. Neha Gupta", "specialty": "Cardiology", "city": "Pune", "fee": 1100.0, "years": 9, "qualification": "DM Cardiology"},
    # General Medicine / Internal Medicine
    {"email": "medicine1@medibook.local", "full_name": "Dr. Suresh Iyer", "specialty": "General Medicine", "city": "Mumbai", "fee": 600.0, "years": 12, "qualification": "MD Medicine"},
    {"email": "medicine2@medibook.local", "full_name": "Dr. Kavita Nair", "specialty": "General Medicine", "city": "Bengaluru", "fee": 650.0, "years": 10, "qualification": "MD Internal Medicine"},
    {"email": "medicine3@medibook.local", "full_name": "Dr. Arjun Desai", "specialty": "Internal Medicine", "city": "Ahmedabad", "fee": 700.0, "years": 11, "qualification": "MD"},
    # Dermatology
    {"email": "doctor2@medibook.local", "full_name": "Dr. Rahul Mehta", "specialty": "Dermatology", "city": "Delhi", "fee": 900.0, "years": 10, "qualification": "MD Dermatology"},
    {"email": "derma2@medibook.local", "full_name": "Dr. Pooja Reddy", "specialty": "Dermatology", "city": "Hyderabad", "fee": 850.0, "years": 8, "qualification": "MD Dermatology"},
    # Orthopedics
    {"email": "ortho1@medibook.local", "full_name": "Dr. Manish Verma", "specialty": "Orthopedics", "city": "Mumbai", "fee": 1000.0, "years": 15, "qualification": "MS Orthopedics"},
    {"email": "ortho2@medibook.local", "full_name": "Dr. Sneha Joshi", "specialty": "Orthopedics", "city": "Pune", "fee": 950.0, "years": 7, "qualification": "MS Ortho"},
    # Neurology
    {"email": "neuro1@medibook.local", "full_name": "Dr. Rohan Malhotra", "specialty": "Neurology", "city": "Delhi", "fee": 1500.0, "years": 16, "qualification": "DM Neurology"},
    {"email": "neuro2@medibook.local", "full_name": "Dr. Aisha Khan", "specialty": "Neurology", "city": "Mumbai", "fee": 1450.0, "years": 12, "qualification": "DM Neurology"},
    # Pediatrics
    {"email": "pedia1@medibook.local", "full_name": "Dr. Meera Banerjee", "specialty": "Pediatrics", "city": "Kolkata", "fee": 700.0, "years": 13, "qualification": "MD Pediatrics"},
    {"email": "pedia2@medibook.local", "full_name": "Dr. Nikhil Rao", "specialty": "Pediatrics", "city": "Bengaluru", "fee": 750.0, "years": 9, "qualification": "MD Pediatrics"},
    # Gynecology / Obstetrics
    {"email": "gynae1@medibook.local", "full_name": "Dr. Sunita Pillai", "specialty": "Gynecology", "city": "Chennai", "fee": 900.0, "years": 14, "qualification": "MS Obstetrics & Gynecology"},
    {"email": "gynae2@medibook.local", "full_name": "Dr. Fatima Sheikh", "specialty": "Obstetrics", "city": "Mumbai", "fee": 950.0, "years": 11, "qualification": "MD OBGYN"},
    # ENT
    {"email": "ent1@medibook.local", "full_name": "Dr. Karan Singh", "specialty": "ENT", "city": "Delhi", "fee": 800.0, "years": 10, "qualification": "MS ENT"},
    {"email": "ent2@medibook.local", "full_name": "Dr. Divya Menon", "specialty": "ENT", "city": "Kochi", "fee": 780.0, "years": 8, "qualification": "MS ENT"},
    # Ophthalmology
    {"email": "eye1@medibook.local", "full_name": "Dr. Anil Chopra", "specialty": "Ophthalmology", "city": "Chandigarh", "fee": 850.0, "years": 17, "qualification": "MS Ophthalmology"},
    {"email": "eye2@medibook.local", "full_name": "Dr. Riya Sen", "specialty": "Ophthalmology", "city": "Kolkata", "fee": 820.0, "years": 6, "qualification": "MD Ophthalmology"},
    # Gastroenterology
    {"email": "gastro1@medibook.local", "full_name": "Dr. Harish Patel", "specialty": "Gastroenterology", "city": "Ahmedabad", "fee": 1200.0, "years": 13, "qualification": "DM Gastroenterology"},
    {"email": "gastro2@medibook.local", "full_name": "Dr. Lata Krishnan", "specialty": "Gastroenterology", "city": "Chennai", "fee": 1150.0, "years": 10, "qualification": "DM Gastro"},
    # Pulmonology
    {"email": "pulm1@medibook.local", "full_name": "Dr. Imran Qureshi", "specialty": "Pulmonology", "city": "Delhi", "fee": 1000.0, "years": 12, "qualification": "DM Pulmonology"},
    # Psychiatry
    {"email": "psych1@medibook.local", "full_name": "Dr. Shruti Das", "specialty": "Psychiatry", "city": "Bengaluru", "fee": 900.0, "years": 11, "qualification": "MD Psychiatry"},
    {"email": "psych2@medibook.local", "full_name": "Dr. Vivek Anand", "specialty": "Psychiatry", "city": "Mumbai", "fee": 950.0, "years": 9, "qualification": "MD Psychiatry"},
    # Urology
    {"email": "uro1@medibook.local", "full_name": "Dr. Deepak Thakur", "specialty": "Urology", "city": "Jaipur", "fee": 1100.0, "years": 14, "qualification": "MCh Urology"},
    # Oncology
    {"email": "onco1@medibook.local", "full_name": "Dr. Priyanka Bose", "specialty": "Oncology", "city": "Mumbai", "fee": 1800.0, "years": 15, "qualification": "DM Medical Oncology"},
    # Endocrinology
    {"email": "endo1@medibook.local", "full_name": "Dr. Naveen Pillai", "specialty": "Endocrinology", "city": "Hyderabad", "fee": 1300.0, "years": 12, "qualification": "DM Endocrinology"},
    # Nephrology
    {"email": "nephro1@medibook.local", "full_name": "Dr. Geeta Saxena", "specialty": "Nephrology", "city": "Lucknow", "fee": 1250.0, "years": 13, "qualification": "DM Nephrology"},
    # Dentistry
    {"email": "dental1@medibook.local", "full_name": "Dr. Sameer Kulkarni", "specialty": "Dentistry", "city": "Pune", "fee": 500.0, "years": 8, "qualification": "BDS, MDS"},
    {"email": "dental2@medibook.local", "full_name": "Dr. Ananya Ghosh", "specialty": "Dentistry", "city": "Kolkata", "fee": 550.0, "years": 7, "qualification": "BDS"},
]

SEED_DEPARTMENTS = [
    ("Cardiology", "Heart and vascular care"),
    ("General Medicine", "Primary and internal medicine"),
    ("Internal Medicine", "Adult internal medicine"),
    ("Dermatology", "Skin, hair and nail care"),
    ("Orthopedics", "Bones, joints and sports injuries"),
    ("Neurology", "Brain and nervous system"),
    ("Pediatrics", "Child and adolescent care"),
    ("Gynecology", "Women's health"),
    ("Obstetrics", "Pregnancy and childbirth"),
    ("ENT", "Ear, nose and throat"),
    ("Ophthalmology", "Eye care"),
    ("Gastroenterology", "Digestive system"),
    ("Pulmonology", "Lungs and respiratory care"),
    ("Psychiatry", "Mental health"),
    ("Urology", "Urinary tract and male reproductive health"),
    ("Oncology", "Cancer care"),
    ("Endocrinology", "Hormones and metabolism"),
    ("Nephrology", "Kidney care"),
    ("Dentistry", "Dental and oral care"),
]

SPECIALTY_CATEGORIES = [name for name, _ in SEED_DEPARTMENTS]

SEED_ACCOUNTS = [
    {"email": "admin@medibook.local", "password": "Admin@123", "role": "admin", "full_name": "MediBook Admin"},
    {
        "email": "patient1@medibook.local",
        "password": "Patient@123",
        "role": "patient",
        "full_name": "Priya Patel",
    },
    {
        "email": "patient2@medibook.local",
        "password": "Patient@123",
        "role": "patient",
        "full_name": "Amit Kumar",
    },
]


def _dept_map(db) -> dict[str, int]:
    from models.org import Department

    out: dict[str, int] = {}
    for name, desc in SEED_DEPARTMENTS:
        row = db.scalar(select(Department).where(Department.name == name))
        if not row:
            row = Department(name=name, description=desc, is_active=True)
            db.add(row)
            db.flush()
        out[name] = row.id
    return out


def ensure_specialty_doctors(db) -> int:
    """Idempotently create category-wise doctors (safe to re-run)."""
    from models.org import Department  # noqa: F401

    depts = _dept_map(db)
    created = 0
    for doc in SEED_DOCTORS:
        existing = db.scalar(select(User).where(User.email == doc["email"].lower()))
        if existing:
            # Keep specialty/department in sync for older seeds
            profile = db.scalar(select(DoctorProfile).where(DoctorProfile.user_id == existing.id))
            if profile:
                profile.specialty = doc["specialty"]
                profile.department_id = depts.get(doc["specialty"])
                profile.consultation_fee = doc.get("fee", profile.consultation_fee)
                profile.city = doc.get("city", profile.city)
                profile.qualification = doc.get("qualification", profile.qualification)
                profile.experience_years = doc.get("years", profile.experience_years)
                profile.is_verified = True
            continue

        user = User(
            email=doc["email"].lower(),
            hashed_password=hash_password("Doctor@123"),
            full_name=doc["full_name"],
            phone="+910000000000",
            role=UserRole.doctor,
            is_active=True,
            email_verified=True,
        )
        db.add(user)
        db.flush()
        profile = DoctorProfile(
            user_id=user.id,
            specialty=doc["specialty"],
            qualification=doc.get("qualification", "MD"),
            experience_years=doc.get("years", 8),
            bio=f"{doc['specialty']} specialist at MediBook · {doc.get('years', 8)}+ years experience",
            consultation_fee=doc.get("fee", 500.0),
            clinic_address=f"MediBook {doc.get('city', 'Clinic')} Centre",
            city=doc.get("city", "Mumbai"),
            rating_avg=round(4.2 + (hash(doc["email"]) % 7) * 0.1, 1),
            is_verified=True,
            department_id=depts.get(doc["specialty"]),
        )
        db.add(profile)
        db.flush()
        for dow in range(0, 5):
            db.add(
                Availability(
                    doctor_id=profile.id,
                    day_of_week=dow,
                    start_time=time(9, 0),
                    end_time=time(13, 0),
                    slot_minutes=30,
                    is_active=True,
                )
            )
        created += 1
    return created


def run_seed(*, reset: bool = False) -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = db.scalar(select(User).where(User.email == "admin@medibook.local"))
        if existing and not reset:
            added = ensure_specialty_doctors(db)
            db.commit()
            logger.info(
                "Core seed already present — ensured specialty doctors (added %s new). "
                "Pass reset=True to rebuild everything.",
                added,
            )
            return

        if reset:
            for table in reversed(Base.metadata.sorted_tables):
                db.execute(table.delete())
            db.commit()

        users: dict[str, User] = {}
        doctors: dict[str, DoctorProfile] = {}
        patients: dict[str, PatientProfile] = {}

        for acct in SEED_ACCOUNTS:
            user = User(
                email=acct["email"],
                hashed_password=hash_password(acct["password"]),
                full_name=acct["full_name"],
                phone="+910000000000",
                role=UserRole(acct["role"]),
                is_active=True,
                email_verified=True,
            )
            db.add(user)
            db.flush()
            users[acct["email"]] = user

            if acct["role"] == "patient":
                profile = PatientProfile(
                    user_id=user.id,
                    date_of_birth=date(1992, 5, 15),
                    gender="female" if "priya" in acct["full_name"].lower() else "male",
                    blood_group="O+",
                    address="India",
                    emergency_contact="+919999999999",
                )
                db.add(profile)
                db.flush()
                patients[acct["email"]] = profile

        ensure_specialty_doctors(db)
        for email in (d["email"] for d in SEED_DOCTORS):
            u = db.scalar(select(User).where(User.email == email.lower()))
            if u:
                users[email] = u
                profile = db.scalar(select(DoctorProfile).where(DoctorProfile.user_id == u.id))
                if profile:
                    doctors[email] = profile

        now = datetime.now(timezone.utc)
        d1 = doctors["doctor1@medibook.local"]
        d2 = doctors["doctor2@medibook.local"]
        p1 = patients["patient1@medibook.local"]
        p2 = patients["patient2@medibook.local"]

        appt_approved = Appointment(
            patient_id=p1.id,
            doctor_id=d1.id,
            scheduled_at=now + timedelta(days=2, hours=2),
            appointment_date=(now + timedelta(days=2, hours=2)).date(),
            appointment_time=(now + timedelta(days=2, hours=2)).time().replace(tzinfo=None),
            duration_minutes=30,
            status=AppointmentStatus.approved,
            payment_status=PaymentStatusOnAppointment.unpaid,
            reason="Chest discomfort follow-up",
            qr_token="seed_qr_approved",
            token_number=1,
        )
        appt_pending = Appointment(
            patient_id=p2.id,
            doctor_id=d2.id,
            scheduled_at=now + timedelta(days=3, hours=1),
            appointment_date=(now + timedelta(days=3, hours=1)).date(),
            appointment_time=(now + timedelta(days=3, hours=1)).time().replace(tzinfo=None),
            duration_minutes=30,
            status=AppointmentStatus.pending,
            payment_status=PaymentStatusOnAppointment.unpaid,
            reason="Skin rash consultation",
            qr_token="seed_qr_pending",
            token_number=1,
        )
        appt_completed = Appointment(
            patient_id=p1.id,
            doctor_id=d1.id,
            scheduled_at=now - timedelta(days=5),
            appointment_date=(now - timedelta(days=5)).date(),
            appointment_time=(now - timedelta(days=5)).time().replace(tzinfo=None),
            duration_minutes=30,
            status=AppointmentStatus.completed,
            payment_status=PaymentStatusOnAppointment.paid,
            reason="Annual cardiac checkup",
            notes="Stable vitals",
            qr_token="seed_qr_completed",
            token_number=1,
        )
        db.add_all([appt_approved, appt_pending, appt_completed])
        db.flush()

        record = MedicalRecord(
            appointment_id=appt_completed.id,
            patient_id=p1.id,
            doctor_id=d1.id,
            diagnosis="Mild hypertension",
            symptoms="Occasional palpitations",
            notes="Advise fasting lipid profile",
        )
        db.add(record)
        db.flush()
        db.add(
            Prescription(
                medical_record_id=record.id,
                appointment_id=appt_completed.id,
                doctor_id=d1.id,
                patient_id=p1.id,
                medicine="Amlodipine",
                dosage="5mg",
                medicines=[
                    {"name": "Amlodipine", "dose": "5mg", "frequency": "1x daily", "duration": "30 days"},
                    {"name": "Aspirin", "dose": "75mg", "frequency": "1x daily", "duration": "30 days"},
                ],
                instructions="Take after breakfast. Follow up in 4 weeks.",
                valid_until=date.today() + timedelta(days=30),
            )
        )

        payment = Payment(
            appointment_id=appt_completed.id,
            patient_id=p1.id,
            amount=d1.consultation_fee,
            currency="INR",
            status=PaymentStatus.success,
            gateway="mock",
            gateway_ref="mock_seed_payment",
            invoice_number="INV-SEED-0001",
            paid_at=now - timedelta(days=4),
        )
        db.add(payment)

        for email, title, message in [
            ("patient1@medibook.local", "Welcome to MediBook", "Your patient account is ready."),
            ("patient1@medibook.local", "Appointment approved", "Your cardiology visit was approved."),
            ("doctor1@medibook.local", "New appointment request", "You have pending appointments."),
            ("admin@medibook.local", "System seeded", "Demo data loaded successfully."),
        ]:
            db.add(
                Notification(
                    user_id=users[email].id,
                    title=title,
                    message=message,
                    type="info",
                    channel="in_app",
                    is_read=False,
                    sent_at=now,
                )
            )

        db.add_all(
            [
                AuditLog(
                    actor_user_id=users["admin@medibook.local"].id,
                    action="system.seed",
                    entity_type="system",
                    entity_id="seed",
                    details={"accounts": len(SEED_ACCOUNTS)},
                ),
                AuditLog(
                    actor_user_id=users["doctor1@medibook.local"].id,
                    action="appointment.complete",
                    entity_type="appointment",
                    entity_id=str(appt_completed.id),
                ),
                AuditLog(
                    actor_user_id=users["patient1@medibook.local"].id,
                    action="payment.confirm",
                    entity_type="payment",
                    entity_id=str(payment.id),
                    details={"invoice": "INV-SEED-0001"},
                ),
            ]
        )

        from models.org import Branch, Department, Permission

        _dept_map(db)
        for name, city in [("MediBook Mumbai", "Mumbai"), ("MediBook Delhi", "Delhi")]:
            if not db.scalar(select(Branch).where(Branch.name == name)):
                db.add(Branch(name=name, address=f"{name} Main Campus", city=city, phone="+910000000000"))
        from models.advanced import Hospital

        h1 = db.scalar(select(Hospital).where(Hospital.code == "MB-WEST"))
        h2 = db.scalar(select(Hospital).where(Hospital.code == "MB-NORTH"))
        if not h1:
            h1 = Hospital(name="MediBook Health Network — West", code="MB-WEST", city="Mumbai", address="Bandra West")
            db.add(h1)
        if not h2:
            h2 = Hospital(name="MediBook Health Network — North", code="MB-NORTH", city="Delhi", address="Connaught Place")
            db.add(h2)
        db.flush()
        branches = list(db.scalars(select(Branch)).all())
        if len(branches) >= 2:
            branches[0].hospital_id = h1.id
            branches[1].hospital_id = h2.id
        for role, code, desc in [
            ("admin", "manage_users", "Manage all users"),
            ("admin", "view_analytics", "View analytics"),
            ("admin", "export_reports", "Export reports"),
            ("doctor", "manage_appointments", "Approve/complete appointments"),
            ("doctor", "write_prescriptions", "Write prescriptions"),
            ("patient", "book_appointments", "Book appointments"),
            ("patient", "view_records", "View medical records"),
        ]:
            if not db.scalar(select(Permission).where(Permission.code == code)):
                db.add(Permission(code=code, description=desc, role=role))

        db.commit()
        logger.info("Seed complete — %s specialty doctors across %s departments", len(SEED_DOCTORS), len(SEED_DEPARTMENTS))
        logger.info("  admin@medibook.local / Admin@123 (admin)")
        logger.info("  All doctors / Doctor@123  (e.g. doctor1@medibook.local, medicine1@medibook.local)")
        logger.info("  patient1@medibook.local / Patient@123 (patient)")
        for specialty in SPECIALTY_CATEGORIES:
            count = sum(1 for d in SEED_DOCTORS if d["specialty"] == specialty)
            if count:
                logger.info("  %s: %s doctor(s)", specialty, count)
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
