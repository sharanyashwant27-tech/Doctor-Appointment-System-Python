"""ORM models — import for Alembic metadata discovery."""
from models.appointment import Appointment, AppointmentStatus, PaymentStatusOnAppointment
from models.audit_log import AuditLog
from models.availability import Availability
from models.clinical import (
    Allergy,
    EmailVerificationToken,
    LabReport,
    PasswordResetToken,
    Vaccination,
    WaitingListEntry,
    WaitingListStatus,
)
from models.doctor import DoctorProfile
from models.medical_record import MedicalRecord
from models.notification import Notification
from models.org import Branch, Department, Permission
from models.patient import PatientProfile
from models.payment import Payment, PaymentStatus
from models.prescription import Prescription
from models.refresh_token import RefreshToken
from models.user import User, UserRole
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
from models.pharmacy import (
    PharmacyMedicine,
    PharmacyOrder,
    PharmacyOrderItem,
    PharmacyOrderStatus,
    PharmacyPaymentStatus,
    PharmacyStockMovement,
    PharmacySupplier,
    StockMovementType,
)

__all__ = [
    "User",
    "UserRole",
    "DoctorProfile",
    "PatientProfile",
    "Availability",
    "Appointment",
    "AppointmentStatus",
    "PaymentStatusOnAppointment",
    "MedicalRecord",
    "Prescription",
    "Payment",
    "PaymentStatus",
    "Notification",
    "AuditLog",
    "RefreshToken",
    "Department",
    "Branch",
    "Permission",
    "WaitingListEntry",
    "WaitingListStatus",
    "Allergy",
    "Vaccination",
    "LabReport",
    "PasswordResetToken",
    "EmailVerificationToken",
    "Hospital",
    "DoctorReview",
    "ChatThread",
    "ChatMessage",
    "MedicineReminder",
    "InsurancePolicy",
    "InsuranceClaim",
    "FaceCredential",
    "DigitalSignature",
    "MedicalCertificate",
    "OcrScan",
    "CalendarSyncToken",
    "HealthAssistantMessage",
    "PharmacySupplier",
    "PharmacyMedicine",
    "PharmacyStockMovement",
    "PharmacyOrder",
    "PharmacyOrderItem",
    "PharmacyOrderStatus",
    "PharmacyPaymentStatus",
    "StockMovementType",
]
