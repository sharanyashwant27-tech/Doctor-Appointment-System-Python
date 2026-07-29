"""reportlab PDF helpers — invoice (and prescription skeleton for W4) (D3)."""
from __future__ import annotations

from datetime import datetime
from io import BytesIO
from typing import Any, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def build_invoice_pdf(
    *,
    invoice_number: str,
    patient_name: str,
    doctor_name: str,
    amount: float,
    currency: str = "INR",
    paid_at: Optional[datetime] = None,
    appointment_ref: Optional[str] = None,
    line_items: Optional[list[dict[str, Any]]] = None,
) -> bytes:
    """Return PDF bytes for a MediBook payment invoice."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title=f"Invoice {invoice_number}",
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "InvoiceTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=18,
        textColor=colors.HexColor("#0B6E4F"),
        spaceAfter=8,
    )
    muted = ParagraphStyle("Muted", parent=styles["Normal"], textColor=colors.grey, fontSize=9)

    story: list[Any] = [
        Paragraph("MediBook", title_style),
        Paragraph("Payment Invoice", styles["Heading2"]),
        Spacer(1, 6),
        Paragraph(f"Invoice #: <b>{invoice_number}</b>", styles["Normal"]),
        Paragraph(f"Date: {(paid_at or datetime.utcnow()).strftime('%Y-%m-%d %H:%M UTC')}", muted),
    ]
    if appointment_ref:
        story.append(Paragraph(f"Appointment: {appointment_ref}", muted))
    story.append(Spacer(1, 12))

    items = line_items or [
        {
            "description": f"Consultation — Dr. {doctor_name}",
            "qty": 1,
            "unit_price": amount,
            "total": amount,
        }
    ]
    table_data = [["Description", "Qty", "Unit", "Total"]]
    for item in items:
        table_data.append(
            [
                str(item.get("description", "")),
                str(item.get("qty", 1)),
                f"{currency} {float(item.get('unit_price', 0)):.2f}",
                f"{currency} {float(item.get('total', 0)):.2f}",
            ]
        )
    table_data.append(["", "", "Total", f"{currency} {amount:.2f}"])

    table = Table(table_data, colWidths=[90 * mm, 20 * mm, 30 * mm, 30 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0B6E4F")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -2), 0.4, colors.lightgrey),
                ("FONTNAME", (2, -1), (-1, -1), "Helvetica-Bold"),
                ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.extend(
        [
            table,
            Spacer(1, 16),
            Paragraph(f"Billed to: <b>{patient_name}</b>", styles["Normal"]),
            Paragraph("Thank you for choosing MediBook.", muted),
        ]
    )
    doc.build(story)
    return buffer.getvalue()


def build_prescription_pdf(
    *,
    patient_name: str,
    doctor_name: str,
    medicines: list[dict[str, Any]],
    instructions: str = "",
    diagnosis: str = "",
) -> bytes:
    """Minimal prescription PDF skeleton — W4 can enrich layout."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, title="Prescription")
    styles = getSampleStyleSheet()
    story: list[Any] = [
        Paragraph("MediBook Prescription", styles["Heading1"]),
        Paragraph(f"Patient: {patient_name}", styles["Normal"]),
        Paragraph(f"Doctor: {doctor_name}", styles["Normal"]),
    ]
    if diagnosis:
        story.append(Paragraph(f"Diagnosis: {diagnosis}", styles["Normal"]))
    story.append(Spacer(1, 10))
    rows = [["Medicine", "Dose", "Frequency", "Duration"]]
    for m in medicines:
        rows.append(
            [
                str(m.get("name", "")),
                str(m.get("dose", "")),
                str(m.get("frequency", "")),
                str(m.get("duration", "")),
            ]
        )
    t = Table(rows, colWidths=[60 * mm, 30 * mm, 40 * mm, 30 * mm])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1B4965")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.lightgrey),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(t)
    if instructions:
        story.append(Spacer(1, 10))
        story.append(Paragraph(f"Instructions: {instructions}", styles["Normal"]))
    doc.build(story)
    return buffer.getvalue()


def build_medical_certificate_pdf(
    *,
    patient_name: str,
    doctor_name: str,
    cert_type: str = "fitness",
    diagnosis: str = "",
    remarks: str = "",
    valid_from: Optional[Any] = None,
    valid_until: Optional[Any] = None,
) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, title="Medical Certificate")
    styles = getSampleStyleSheet()
    title = ParagraphStyle(
        "CertTitle",
        parent=styles["Heading1"],
        textColor=colors.HexColor("#1B4965"),
        fontSize=18,
    )
    story: list[Any] = [
        Paragraph("MediBook Medical Certificate", title),
        Spacer(1, 8),
        Paragraph(f"Type: <b>{cert_type.replace('_', ' ').title()}</b>", styles["Normal"]),
        Paragraph(f"Patient: <b>{patient_name}</b>", styles["Normal"]),
        Paragraph(f"Issuing doctor: <b>Dr. {doctor_name}</b>", styles["Normal"]),
        Spacer(1, 10),
    ]
    if diagnosis:
        story.append(Paragraph(f"Diagnosis / finding: {diagnosis}", styles["Normal"]))
    if remarks:
        story.append(Paragraph(f"Remarks: {remarks}", styles["Normal"]))
    vf = str(valid_from) if valid_from else "—"
    vu = str(valid_until) if valid_until else "—"
    story.extend(
        [
            Spacer(1, 10),
            Paragraph(f"Valid from: {vf} &nbsp;&nbsp; until: {vu}", styles["Normal"]),
            Spacer(1, 20),
            Paragraph("This certificate is generated digitally by MediBook.", styles["Normal"]),
            Paragraph(f"Issued: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", styles["Normal"]),
        ]
    )
    doc.build(story)
    return buffer.getvalue()
