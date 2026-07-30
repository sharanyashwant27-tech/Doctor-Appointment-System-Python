"""Pharmacy inventory, stock, dispense, and walk-in sales."""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any, Optional
from uuid import uuid4

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from models.patient import PatientProfile
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
from models.prescription import Prescription
from models.user import User, UserRole
from services.audit_service import write_audit
from utils.exceptions import BadRequestError, ForbiddenError, NotFoundError, ValidationAppError


def _role(user: User) -> str:
    return user.role.value if isinstance(user.role, UserRole) else str(user.role)


def _patient(db: Session, user: User) -> PatientProfile:
    p = db.scalar(select(PatientProfile).where(PatientProfile.user_id == user.id))
    if not p:
        raise ForbiddenError("Patient profile required")
    return p


def medicine_to_dict(m: PharmacyMedicine) -> dict[str, Any]:
    return {
        "id": m.id,
        "sku": m.sku,
        "name": m.name,
        "generic_name": m.generic_name,
        "category": m.category,
        "unit": m.unit,
        "pack_size": m.pack_size,
        "mrp": m.mrp,
        "cost_price": m.cost_price,
        "stock_qty": m.stock_qty,
        "reorder_level": m.reorder_level,
        "expiry_date": m.expiry_date,
        "supplier_id": m.supplier_id,
        "supplier_name": m.supplier.name if m.supplier else None,
        "requires_prescription": m.requires_prescription,
        "is_active": m.is_active,
        "low_stock": m.stock_qty <= m.reorder_level,
        "created_at": m.created_at,
    }


def order_to_dict(db: Session, order: PharmacyOrder) -> dict[str, Any]:
    patient_name = None
    if order.patient_id:
        p = db.scalar(
            select(PatientProfile)
            .options(joinedload(PatientProfile.user))
            .where(PatientProfile.id == order.patient_id)
        )
        if p and p.user:
            patient_name = p.user.full_name
    items = []
    for it in order.items:
        med = db.get(PharmacyMedicine, it.medicine_id)
        items.append(
            {
                "id": it.id,
                "medicine_id": it.medicine_id,
                "medicine_name": med.name if med else None,
                "qty": it.qty,
                "unit_price": it.unit_price,
                "line_total": it.line_total,
            }
        )
    return {
        "id": order.id,
        "order_number": order.order_number,
        "patient_id": order.patient_id,
        "patient_name": patient_name,
        "prescription_id": order.prescription_id,
        "status": order.status,
        "total_amount": order.total_amount,
        "payment_status": order.payment_status,
        "notes": order.notes,
        "created_at": order.created_at,
        "dispensed_at": order.dispensed_at,
        "items": items,
    }


def list_suppliers(db: Session, *, active_only: bool = True) -> list[PharmacySupplier]:
    q = select(PharmacySupplier).order_by(PharmacySupplier.name)
    if active_only:
        q = q.where(PharmacySupplier.is_active.is_(True))
    return list(db.scalars(q).all())


def create_supplier(db: Session, user: User, data: dict[str, Any]) -> PharmacySupplier:
    row = PharmacySupplier(**data)
    db.add(row)
    write_audit(db, actor_user_id=user.id, action="pharmacy.supplier.create", entity_type="pharmacy_supplier")
    db.commit()
    db.refresh(row)
    return row


def update_supplier(db: Session, user: User, supplier_id: int, data: dict[str, Any]) -> PharmacySupplier:
    row = db.get(PharmacySupplier, supplier_id)
    if not row:
        raise NotFoundError("Supplier not found")
    for k, v in data.items():
        if v is not None:
            setattr(row, k, v)
    write_audit(
        db,
        actor_user_id=user.id,
        action="pharmacy.supplier.update",
        entity_type="pharmacy_supplier",
        entity_id=str(row.id),
    )
    db.commit()
    db.refresh(row)
    return row


def list_medicines(
    db: Session,
    *,
    q: Optional[str] = None,
    low_stock: bool = False,
    active_only: bool = True,
) -> list[dict[str, Any]]:
    stmt = select(PharmacyMedicine).options(joinedload(PharmacyMedicine.supplier)).order_by(PharmacyMedicine.name)
    if active_only:
        stmt = stmt.where(PharmacyMedicine.is_active.is_(True))
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                PharmacyMedicine.name.ilike(like),
                PharmacyMedicine.generic_name.ilike(like),
                PharmacyMedicine.sku.ilike(like),
                PharmacyMedicine.category.ilike(like),
            )
        )
    rows = list(db.scalars(stmt).unique().all())
    out = [medicine_to_dict(m) for m in rows]
    if low_stock:
        out = [m for m in out if m["low_stock"]]
    return out


def get_medicine(db: Session, medicine_id: int) -> dict[str, Any]:
    m = db.scalar(
        select(PharmacyMedicine)
        .options(joinedload(PharmacyMedicine.supplier))
        .where(PharmacyMedicine.id == medicine_id)
    )
    if not m:
        raise NotFoundError("Medicine not found")
    return medicine_to_dict(m)


def create_medicine(db: Session, user: User, data: dict[str, Any]) -> dict[str, Any]:
    if db.scalar(select(PharmacyMedicine).where(PharmacyMedicine.sku == data["sku"])):
        raise ValidationAppError("SKU already exists")
    stock = int(data.pop("stock_qty", 0) or 0)
    row = PharmacyMedicine(**data, stock_qty=0)
    db.add(row)
    db.flush()
    if stock > 0:
        _apply_stock(
            db,
            medicine=row,
            qty_delta=stock,
            movement_type=StockMovementType.purchase,
            user=user,
            notes="Initial stock",
        )
    write_audit(
        db,
        actor_user_id=user.id,
        action="pharmacy.medicine.create",
        entity_type="pharmacy_medicine",
        entity_id=str(row.id),
        details={"sku": row.sku},
    )
    db.commit()
    return get_medicine(db, row.id)


def update_medicine(db: Session, user: User, medicine_id: int, data: dict[str, Any]) -> dict[str, Any]:
    row = db.get(PharmacyMedicine, medicine_id)
    if not row:
        raise NotFoundError("Medicine not found")
    for k, v in data.items():
        if v is not None:
            setattr(row, k, v)
    write_audit(
        db,
        actor_user_id=user.id,
        action="pharmacy.medicine.update",
        entity_type="pharmacy_medicine",
        entity_id=str(row.id),
    )
    db.commit()
    return get_medicine(db, row.id)


def _apply_stock(
    db: Session,
    *,
    medicine: PharmacyMedicine,
    qty_delta: int,
    movement_type: StockMovementType,
    user: User,
    notes: Optional[str] = None,
    ref_type: Optional[str] = None,
    ref_id: Optional[str] = None,
) -> None:
    new_qty = medicine.stock_qty + qty_delta
    if new_qty < 0:
        raise ValidationAppError(f"Insufficient stock for {medicine.name} (have {medicine.stock_qty})")
    medicine.stock_qty = new_qty
    db.add(
        PharmacyStockMovement(
            medicine_id=medicine.id,
            movement_type=movement_type,
            qty=qty_delta,
            ref_type=ref_type,
            ref_id=ref_id,
            notes=notes,
            created_by=user.id,
        )
    )


def purchase_stock(db: Session, user: User, medicine_id: int, qty: int, unit_cost: Optional[float], notes: Optional[str]) -> dict[str, Any]:
    m = db.get(PharmacyMedicine, medicine_id)
    if not m:
        raise NotFoundError("Medicine not found")
    if unit_cost is not None:
        m.cost_price = float(unit_cost)
    _apply_stock(
        db,
        medicine=m,
        qty_delta=qty,
        movement_type=StockMovementType.purchase,
        user=user,
        notes=notes or "Purchase receive",
        ref_type="purchase",
    )
    write_audit(
        db,
        actor_user_id=user.id,
        action="pharmacy.stock.purchase",
        entity_type="pharmacy_medicine",
        entity_id=str(m.id),
        details={"qty": qty},
    )
    db.commit()
    return get_medicine(db, m.id)


def adjust_stock(db: Session, user: User, medicine_id: int, qty_delta: int, notes: Optional[str]) -> dict[str, Any]:
    if qty_delta == 0:
        raise ValidationAppError("qty_delta must be non-zero")
    m = db.get(PharmacyMedicine, medicine_id)
    if not m:
        raise NotFoundError("Medicine not found")
    movement = StockMovementType.adjust if qty_delta > 0 else StockMovementType.expired
    _apply_stock(
        db,
        medicine=m,
        qty_delta=qty_delta,
        movement_type=movement,
        user=user,
        notes=notes or "Stock adjustment",
        ref_type="adjust",
    )
    write_audit(
        db,
        actor_user_id=user.id,
        action="pharmacy.stock.adjust",
        entity_type="pharmacy_medicine",
        entity_id=str(m.id),
        details={"qty_delta": qty_delta},
    )
    db.commit()
    return get_medicine(db, m.id)


def _new_order_number() -> str:
    return f"RXO-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}"


def _build_items(db: Session, lines: list[dict[str, Any]]) -> tuple[list[PharmacyOrderItem], float]:
    items: list[PharmacyOrderItem] = []
    total = 0.0
    for line in lines:
        med = db.get(PharmacyMedicine, line["medicine_id"])
        if not med or not med.is_active:
            raise NotFoundError(f"Medicine {line['medicine_id']} not found")
        qty = int(line["qty"])
        if qty <= 0:
            raise ValidationAppError("Quantity must be positive")
        if med.stock_qty < qty:
            raise ValidationAppError(f"Insufficient stock for {med.name}")
        line_total = round(med.mrp * qty, 2)
        total += line_total
        items.append(
            PharmacyOrderItem(
                medicine_id=med.id,
                qty=qty,
                unit_price=med.mrp,
                line_total=line_total,
            )
        )
    return items, round(total, 2)


def _deduct_for_order(db: Session, user: User, order: PharmacyOrder, movement: StockMovementType) -> None:
    for it in order.items:
        med = db.get(PharmacyMedicine, it.medicine_id)
        assert med is not None
        _apply_stock(
            db,
            medicine=med,
            qty_delta=-it.qty,
            movement_type=movement,
            user=user,
            notes=f"Order {order.order_number}",
            ref_type="order",
            ref_id=str(order.id),
        )


def dispense_from_prescription(
    db: Session,
    user: User,
    *,
    prescription_id: int,
    items: list[dict[str, Any]],
    mark_paid: bool = True,
    notes: Optional[str] = None,
) -> dict[str, Any]:
    rx = db.get(Prescription, prescription_id)
    if not rx:
        raise NotFoundError("Prescription not found")
    order_items, total = _build_items(db, items)
    order = PharmacyOrder(
        order_number=_new_order_number(),
        patient_id=rx.patient_id,
        prescription_id=rx.id,
        status=PharmacyOrderStatus.dispensed,
        total_amount=total,
        payment_status=PharmacyPaymentStatus.paid if mark_paid else PharmacyPaymentStatus.unpaid,
        notes=notes,
        created_by=user.id,
        dispensed_at=datetime.now(timezone.utc),
    )
    db.add(order)
    db.flush()
    for it in order_items:
        it.order_id = order.id
        db.add(it)
    db.flush()
    _deduct_for_order(db, user, order, StockMovementType.dispense)
    write_audit(
        db,
        actor_user_id=user.id,
        action="pharmacy.order.dispense",
        entity_type="pharmacy_order",
        entity_id=str(order.id),
        details={"prescription_id": prescription_id, "total": total},
    )
    db.commit()
    db.refresh(order)
    return order_to_dict(db, order)


def walk_in_sale(
    db: Session,
    user: User,
    *,
    items: list[dict[str, Any]],
    patient_id: Optional[int] = None,
    customer_name: Optional[str] = None,
    mark_paid: bool = True,
    notes: Optional[str] = None,
) -> dict[str, Any]:
    for line in items:
        med = db.get(PharmacyMedicine, line["medicine_id"])
        if med and med.requires_prescription and not patient_id:
            raise BadRequestError(f"{med.name} requires a prescription — use dispense from Rx")
    order_items, total = _build_items(db, items)
    note_parts = [notes] if notes else []
    if customer_name:
        note_parts.append(f"Walk-in: {customer_name}")
    order = PharmacyOrder(
        order_number=_new_order_number(),
        patient_id=patient_id,
        prescription_id=None,
        status=PharmacyOrderStatus.dispensed,
        total_amount=total,
        payment_status=PharmacyPaymentStatus.paid if mark_paid else PharmacyPaymentStatus.unpaid,
        notes=" · ".join(note_parts) if note_parts else "Walk-in sale",
        created_by=user.id,
        dispensed_at=datetime.now(timezone.utc),
    )
    db.add(order)
    db.flush()
    for it in order_items:
        it.order_id = order.id
        db.add(it)
    db.flush()
    _deduct_for_order(db, user, order, StockMovementType.sale)
    write_audit(
        db,
        actor_user_id=user.id,
        action="pharmacy.order.walk_in",
        entity_type="pharmacy_order",
        entity_id=str(order.id),
        details={"total": total},
    )
    db.commit()
    db.refresh(order)
    return order_to_dict(db, order)


def patient_request_order(db: Session, user: User, prescription_id: int, notes: Optional[str] = None) -> dict[str, Any]:
    patient = _patient(db, user)
    rx = db.get(Prescription, prescription_id)
    if not rx:
        raise NotFoundError("Prescription not found")
    if rx.patient_id != patient.id:
        raise ForbiddenError("Not your prescription")

    existing = db.scalar(
        select(PharmacyOrder).where(
            PharmacyOrder.prescription_id == prescription_id,
            PharmacyOrder.status.in_([PharmacyOrderStatus.pending, PharmacyOrderStatus.ready, PharmacyOrderStatus.dispensed]),
        )
    )
    if existing and existing.status == PharmacyOrderStatus.dispensed:
        raise ValidationAppError("Prescription already dispensed")
    if existing and existing.status in {PharmacyOrderStatus.pending, PharmacyOrderStatus.ready}:
        return order_to_dict(db, existing)

    # Auto-match Rx medicine names to catalog
    lines: list[dict[str, Any]] = []
    rx_meds = rx.medicines if isinstance(rx.medicines, list) else []
    if not rx_meds and rx.medicine:
        rx_meds = [{"name": rx.medicine, "dose": rx.dosage or ""}]
    for entry in rx_meds:
        name = str(entry.get("name") or "").strip()
        if not name:
            continue
        med = db.scalar(
            select(PharmacyMedicine).where(
                PharmacyMedicine.is_active.is_(True),
                or_(PharmacyMedicine.name.ilike(name), PharmacyMedicine.generic_name.ilike(name)),
            )
        )
        if med:
            lines.append({"medicine_id": med.id, "qty": max(1, med.pack_size)})

    order_items: list[PharmacyOrderItem] = []
    total = 0.0
    for line in lines:
        med = db.get(PharmacyMedicine, line["medicine_id"])
        assert med
        qty = line["qty"]
        lt = round(med.mrp * qty, 2)
        total += lt
        order_items.append(
            PharmacyOrderItem(medicine_id=med.id, qty=qty, unit_price=med.mrp, line_total=lt)
        )

    order = PharmacyOrder(
        order_number=_new_order_number(),
        patient_id=patient.id,
        prescription_id=rx.id,
        status=PharmacyOrderStatus.pending,
        total_amount=round(total, 2),
        payment_status=PharmacyPaymentStatus.unpaid,
        notes=notes or "Patient fulfillment request",
        created_by=user.id,
    )
    db.add(order)
    db.flush()
    for it in order_items:
        it.order_id = order.id
        db.add(it)
    write_audit(
        db,
        actor_user_id=user.id,
        action="pharmacy.order.request",
        entity_type="pharmacy_order",
        entity_id=str(order.id),
        details={"prescription_id": prescription_id},
    )
    db.commit()
    db.refresh(order)
    return order_to_dict(db, order)


def dispense_pending_order(db: Session, user: User, order_id: int, mark_paid: bool = True) -> dict[str, Any]:
    order = db.scalar(
        select(PharmacyOrder)
        .options(joinedload(PharmacyOrder.items))
        .where(PharmacyOrder.id == order_id)
    )
    if not order:
        raise NotFoundError("Order not found")
    if order.status not in {PharmacyOrderStatus.pending, PharmacyOrderStatus.ready}:
        raise ValidationAppError("Order is not pending")
    if not order.items:
        raise ValidationAppError("Order has no items — add medicines before dispense")
    for it in order.items:
        med = db.get(PharmacyMedicine, it.medicine_id)
        if not med or med.stock_qty < it.qty:
            raise ValidationAppError(f"Insufficient stock for item {it.medicine_id}")
    _deduct_for_order(db, user, order, StockMovementType.dispense)
    order.status = PharmacyOrderStatus.dispensed
    order.dispensed_at = datetime.now(timezone.utc)
    if mark_paid:
        order.payment_status = PharmacyPaymentStatus.paid
    write_audit(
        db,
        actor_user_id=user.id,
        action="pharmacy.order.dispense_pending",
        entity_type="pharmacy_order",
        entity_id=str(order.id),
    )
    db.commit()
    db.refresh(order)
    return order_to_dict(db, order)


def list_orders(db: Session, user: User, *, status: Optional[str] = None) -> list[dict[str, Any]]:
    role = _role(user)
    q = select(PharmacyOrder).options(joinedload(PharmacyOrder.items)).order_by(PharmacyOrder.created_at.desc())
    if role == "patient":
        p = _patient(db, user)
        q = q.where(PharmacyOrder.patient_id == p.id)
    elif role not in {"admin", "doctor"}:
        raise ForbiddenError("Insufficient permissions")
    if status:
        q = q.where(PharmacyOrder.status == PharmacyOrderStatus(status))
    rows = list(db.scalars(q).unique().all())
    return [order_to_dict(db, o) for o in rows]


def pharmacy_stats(db: Session) -> dict[str, Any]:
    medicines = list(db.scalars(select(PharmacyMedicine).where(PharmacyMedicine.is_active.is_(True))).all())
    low = sum(1 for m in medicines if m.stock_qty <= m.reorder_level)
    pending = db.scalar(
        select(func.count()).select_from(PharmacyOrder).where(PharmacyOrder.status == PharmacyOrderStatus.pending)
    ) or 0
    today = datetime.now(timezone.utc).date()
    start = datetime.combine(today, datetime.min.time(), tzinfo=timezone.utc)
    today_orders = list(
        db.scalars(
            select(PharmacyOrder).where(
                PharmacyOrder.dispensed_at >= start,
                PharmacyOrder.status == PharmacyOrderStatus.dispensed,
            )
        ).all()
    )
    soon = date.today() + timedelta(days=60)
    expiring = sum(1 for m in medicines if m.expiry_date and m.expiry_date <= soon)
    return {
        "medicines_count": len(medicines),
        "low_stock_count": low,
        "pending_orders": int(pending),
        "today_sales": round(sum(o.total_amount for o in today_orders), 2),
        "today_orders": len(today_orders),
        "expiring_soon": expiring,
    }


def match_prescription_lines(db: Session, prescription_id: int) -> list[dict[str, Any]]:
    """Suggest catalog matches for a prescription (admin dispense UI)."""
    rx = db.get(Prescription, prescription_id)
    if not rx:
        raise NotFoundError("Prescription not found")
    rx_meds = rx.medicines if isinstance(rx.medicines, list) else []
    if not rx_meds and rx.medicine:
        rx_meds = [{"name": rx.medicine, "dose": rx.dosage or ""}]
    suggestions = []
    for entry in rx_meds:
        name = str(entry.get("name") or "").strip()
        med = None
        if name:
            med = db.scalar(
                select(PharmacyMedicine).where(
                    PharmacyMedicine.is_active.is_(True),
                    or_(PharmacyMedicine.name.ilike(f"%{name}%"), PharmacyMedicine.generic_name.ilike(f"%{name}%")),
                )
            )
        suggestions.append(
            {
                "rx_name": name,
                "rx_dose": entry.get("dose"),
                "rx_frequency": entry.get("frequency"),
                "matched_medicine": medicine_to_dict(med) if med else None,
            }
        )
    return suggestions
