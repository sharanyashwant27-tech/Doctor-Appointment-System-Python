"""CSV / XLSX / PDF tabular exports for admin (Pandas + ReportLab)."""
from __future__ import annotations

from io import BytesIO
from typing import Any, Sequence

import pandas as pd
from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle
from sqlalchemy import select
from sqlalchemy.orm import Session

from utils.exceptions import ValidationAppError
from models.appointment import Appointment
from models.audit_log import AuditLog
from models.payment import Payment
from models.user import User


def _users_rows(db: Session) -> tuple[list[str], list[list[Any]]]:
    headers = ["id", "email", "full_name", "role", "is_active", "created_at"]
    rows = []
    for u in db.scalars(select(User).order_by(User.id)).all():
        rows.append(
            [
                u.id,
                u.email,
                u.full_name,
                u.role.value if hasattr(u.role, "value") else u.role,
                u.is_active,
                u.created_at.isoformat() if u.created_at else "",
            ]
        )
    return headers, rows


def _appointments_rows(db: Session) -> tuple[list[str], list[list[Any]]]:
    headers = ["id", "patient_id", "doctor_id", "scheduled_at", "status", "duration_minutes"]
    rows = []
    for a in db.scalars(select(Appointment).order_by(Appointment.id)).all():
        rows.append(
            [
                a.id,
                a.patient_id,
                a.doctor_id,
                a.scheduled_at.isoformat() if a.scheduled_at else "",
                a.status.value if hasattr(a.status, "value") else a.status,
                a.duration_minutes,
            ]
        )
    return headers, rows


def _payments_rows(db: Session) -> tuple[list[str], list[list[Any]]]:
    headers = ["id", "appointment_id", "patient_id", "amount", "currency", "status", "invoice_number", "paid_at"]
    rows = []
    for p in db.scalars(select(Payment).order_by(Payment.id)).all():
        rows.append(
            [
                p.id,
                p.appointment_id,
                p.patient_id,
                p.amount,
                p.currency,
                p.status.value if hasattr(p.status, "value") else p.status,
                p.invoice_number or "",
                p.paid_at.isoformat() if p.paid_at else "",
            ]
        )
    return headers, rows


def _audit_rows(db: Session) -> tuple[list[str], list[list[Any]]]:
    headers = ["id", "actor_user_id", "action", "entity_type", "entity_id", "created_at"]
    rows = []
    for a in db.scalars(select(AuditLog).order_by(AuditLog.id)).all():
        rows.append(
            [
                a.id,
                a.actor_user_id,
                a.action,
                a.entity_type,
                a.entity_id or "",
                a.created_at.isoformat() if a.created_at else "",
            ]
        )
    return headers, rows


RESOURCE_LOADERS = {
    "users": _users_rows,
    "appointments": _appointments_rows,
    "payments": _payments_rows,
    "audit_logs": _audit_rows,
}


def _load(db: Session, resource: str) -> tuple[list[str], list[list[Any]]]:
    if resource not in RESOURCE_LOADERS:
        raise ValidationAppError(f"Unknown export resource: {resource}")
    return RESOURCE_LOADERS[resource](db)


def _to_dataframe(db: Session, resource: str) -> pd.DataFrame:
    headers, rows = _load(db, resource)
    return pd.DataFrame(rows, columns=headers)


def export_csv(db: Session, resource: str) -> bytes:
    df = _to_dataframe(db, resource)
    return df.to_csv(index=False).encode("utf-8")


def export_xlsx(db: Session, resource: str) -> bytes:
    df = _to_dataframe(db, resource)
    out = BytesIO()
    with pd.ExcelWriter(out, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name=resource[:31], index=False)
    return out.getvalue()


def export_pdf(db: Session, resource: str) -> bytes:
    df = _to_dataframe(db, resource)
    headers = list(df.columns)
    rows = df.head(200).astype(str).values.tolist()
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(A4), title=f"MediBook {resource}")
    data: list[Sequence[Any]] = [headers] + rows
    table = Table(data, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0B6E4F")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
            ]
        )
    )
    doc.build([table])
    return buffer.getvalue()


def export_resource(db: Session, resource: str, fmt: str) -> tuple[bytes, str, str]:
    fmt = fmt.lower()
    if fmt == "csv":
        return export_csv(db, resource), "text/csv", f"{resource}.csv"
    if fmt in {"xlsx", "excel"}:
        return export_xlsx(db, resource), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", f"{resource}.xlsx"
    if fmt == "pdf":
        return export_pdf(db, resource), "application/pdf", f"{resource}.pdf"
    raise ValidationAppError("format must be csv, xlsx, or pdf")
