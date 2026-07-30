"""Pharmacy schemas."""
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field

from models.pharmacy import PharmacyOrderStatus, PharmacyPaymentStatus, StockMovementType
from schemas.common import ORMModel


class SupplierCreate(BaseModel):
    name: str
    contact: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    contact: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None


class SupplierOut(ORMModel):
    id: int
    name: str
    contact: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None


class MedicineCreate(BaseModel):
    sku: str
    name: str
    generic_name: Optional[str] = None
    category: Optional[str] = None
    unit: str = "tablet"
    pack_size: int = 1
    mrp: float
    cost_price: float = 0.0
    stock_qty: int = 0
    reorder_level: int = 20
    expiry_date: Optional[date] = None
    supplier_id: Optional[int] = None
    requires_prescription: bool = False


class MedicineUpdate(BaseModel):
    name: Optional[str] = None
    generic_name: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    pack_size: Optional[int] = None
    mrp: Optional[float] = None
    cost_price: Optional[float] = None
    reorder_level: Optional[int] = None
    expiry_date: Optional[date] = None
    supplier_id: Optional[int] = None
    requires_prescription: Optional[bool] = None
    is_active: Optional[bool] = None


class MedicineOut(ORMModel):
    id: int
    sku: str
    name: str
    generic_name: Optional[str] = None
    category: Optional[str] = None
    unit: str
    pack_size: int
    mrp: float
    cost_price: float
    stock_qty: int
    reorder_level: int
    expiry_date: Optional[date] = None
    supplier_id: Optional[int] = None
    supplier_name: Optional[str] = None
    requires_prescription: bool
    is_active: bool
    low_stock: bool = False
    created_at: Optional[datetime] = None


class StockPurchaseRequest(BaseModel):
    medicine_id: int
    qty: int = Field(gt=0)
    unit_cost: Optional[float] = None
    notes: Optional[str] = None


class StockAdjustRequest(BaseModel):
    medicine_id: int
    qty_delta: int  # positive or negative
    notes: Optional[str] = None


class OrderLineIn(BaseModel):
    medicine_id: int
    qty: int = Field(gt=0)


class DispenseFromPrescriptionRequest(BaseModel):
    prescription_id: int
    items: list[OrderLineIn]
    mark_paid: bool = True
    notes: Optional[str] = None


class WalkInSaleRequest(BaseModel):
    items: list[OrderLineIn]
    patient_id: Optional[int] = None
    customer_name: Optional[str] = None
    mark_paid: bool = True
    notes: Optional[str] = None


class PatientRequestOrderRequest(BaseModel):
    prescription_id: int
    notes: Optional[str] = None


class OrderItemOut(ORMModel):
    id: int
    medicine_id: int
    medicine_name: Optional[str] = None
    qty: int
    unit_price: float
    line_total: float


class OrderOut(ORMModel):
    id: int
    order_number: str
    patient_id: Optional[int] = None
    patient_name: Optional[str] = None
    prescription_id: Optional[int] = None
    status: PharmacyOrderStatus
    total_amount: float
    payment_status: PharmacyPaymentStatus
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    dispensed_at: Optional[datetime] = None
    items: list[OrderItemOut] = []


class PharmacyStats(BaseModel):
    medicines_count: int
    low_stock_count: int
    pending_orders: int
    today_sales: float
    today_orders: int
    expiring_soon: int
