"""Pharmacy Management API."""
from typing import List, Optional

from fastapi import APIRouter, Depends

from api.deps import AdminUser, DbSession, PatientUser, require_roles
from models.user import User
from schemas.pharmacy import (
    DispenseFromPrescriptionRequest,
    MedicineCreate,
    MedicineOut,
    MedicineUpdate,
    OrderOut,
    PatientRequestOrderRequest,
    PharmacyStats,
    StockAdjustRequest,
    StockPurchaseRequest,
    SupplierCreate,
    SupplierOut,
    SupplierUpdate,
    WalkInSaleRequest,
)
from services import pharmacy_service

router = APIRouter(prefix="/pharmacy", tags=["pharmacy"])


@router.get("/stats", response_model=PharmacyStats)
def stats(_: AdminUser, db: DbSession):
    return pharmacy_service.pharmacy_stats(db)


@router.get("/suppliers", response_model=List[SupplierOut])
def list_suppliers(_: AdminUser, db: DbSession):
    return pharmacy_service.list_suppliers(db)


@router.post("/suppliers", response_model=SupplierOut, status_code=201)
def create_supplier(payload: SupplierCreate, user: AdminUser, db: DbSession):
    return pharmacy_service.create_supplier(db, user, payload.model_dump())


@router.patch("/suppliers/{supplier_id}", response_model=SupplierOut)
def update_supplier(supplier_id: int, payload: SupplierUpdate, user: AdminUser, db: DbSession):
    return pharmacy_service.update_supplier(db, user, supplier_id, payload.model_dump(exclude_unset=True))


@router.get("/medicines", response_model=List[MedicineOut])
def list_medicines(
    db: DbSession,
    user: User = Depends(require_roles("admin", "doctor")),
    q: Optional[str] = None,
    low_stock: bool = False,
):
    return pharmacy_service.list_medicines(db, q=q, low_stock=low_stock)


@router.get("/medicines/{medicine_id}", response_model=MedicineOut)
def get_medicine(
    medicine_id: int,
    db: DbSession,
    user: User = Depends(require_roles("admin", "doctor")),
):
    return pharmacy_service.get_medicine(db, medicine_id)


@router.post("/medicines", response_model=MedicineOut, status_code=201)
def create_medicine(payload: MedicineCreate, user: AdminUser, db: DbSession):
    return pharmacy_service.create_medicine(db, user, payload.model_dump())


@router.patch("/medicines/{medicine_id}", response_model=MedicineOut)
def update_medicine(medicine_id: int, payload: MedicineUpdate, user: AdminUser, db: DbSession):
    return pharmacy_service.update_medicine(db, user, medicine_id, payload.model_dump(exclude_unset=True))


@router.post("/stock/purchase", response_model=MedicineOut)
def purchase_stock(payload: StockPurchaseRequest, user: AdminUser, db: DbSession):
    return pharmacy_service.purchase_stock(
        db, user, payload.medicine_id, payload.qty, payload.unit_cost, payload.notes
    )


@router.post("/stock/adjust", response_model=MedicineOut)
def adjust_stock(payload: StockAdjustRequest, user: AdminUser, db: DbSession):
    return pharmacy_service.adjust_stock(db, user, payload.medicine_id, payload.qty_delta, payload.notes)


@router.get("/orders", response_model=List[OrderOut])
def list_orders(
    db: DbSession,
    user: User = Depends(require_roles("admin", "doctor", "patient")),
    status: Optional[str] = None,
):
    return pharmacy_service.list_orders(db, user, status=status)


@router.get("/prescriptions/{prescription_id}/match")
def match_rx(prescription_id: int, user: AdminUser, db: DbSession):
    return pharmacy_service.match_prescription_lines(db, prescription_id)


@router.post("/orders/from-prescription", response_model=OrderOut, status_code=201)
def dispense_rx(payload: DispenseFromPrescriptionRequest, user: AdminUser, db: DbSession):
    return pharmacy_service.dispense_from_prescription(
        db,
        user,
        prescription_id=payload.prescription_id,
        items=[i.model_dump() for i in payload.items],
        mark_paid=payload.mark_paid,
        notes=payload.notes,
    )


@router.post("/orders/walk-in", response_model=OrderOut, status_code=201)
def walk_in(payload: WalkInSaleRequest, user: AdminUser, db: DbSession):
    return pharmacy_service.walk_in_sale(
        db,
        user,
        items=[i.model_dump() for i in payload.items],
        patient_id=payload.patient_id,
        customer_name=payload.customer_name,
        mark_paid=payload.mark_paid,
        notes=payload.notes,
    )


@router.post("/orders/request", response_model=OrderOut, status_code=201)
def patient_request(payload: PatientRequestOrderRequest, user: PatientUser, db: DbSession):
    return pharmacy_service.patient_request_order(db, user, payload.prescription_id, payload.notes)


@router.post("/orders/{order_id}/dispense", response_model=OrderOut)
def dispense_order(order_id: int, user: AdminUser, db: DbSession, mark_paid: bool = True):
    return pharmacy_service.dispense_pending_order(db, user, order_id, mark_paid=mark_paid)
