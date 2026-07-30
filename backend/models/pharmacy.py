"""Pharmacy ORM models — inventory, stock, orders."""
from __future__ import annotations

import enum
from datetime import date, datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, Date, DateTime, Enum, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base

if TYPE_CHECKING:
    pass


class StockMovementType(str, enum.Enum):
    purchase = "purchase"
    sale = "sale"
    dispense = "dispense"
    adjust = "adjust"
    expired = "expired"


class PharmacyOrderStatus(str, enum.Enum):
    pending = "pending"
    ready = "ready"
    dispensed = "dispensed"
    cancelled = "cancelled"


class PharmacyPaymentStatus(str, enum.Enum):
    unpaid = "unpaid"
    paid = "paid"
    refunded = "refunded"


class PharmacySupplier(Base):
    __tablename__ = "pharmacy_suppliers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    contact: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    medicines: Mapped[list["PharmacyMedicine"]] = relationship(back_populates="supplier")


class PharmacyMedicine(Base):
    __tablename__ = "pharmacy_medicines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sku: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    generic_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    unit: Mapped[str] = mapped_column(String(40), default="tablet")
    pack_size: Mapped[int] = mapped_column(Integer, default=1)
    mrp: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    cost_price: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    stock_qty: Mapped[int] = mapped_column(Integer, default=0)
    reorder_level: Mapped[int] = mapped_column(Integer, default=20)
    expiry_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    supplier_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pharmacy_suppliers.id"), nullable=True)
    requires_prescription: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    supplier: Mapped[Optional["PharmacySupplier"]] = relationship(back_populates="medicines")
    movements: Mapped[list["PharmacyStockMovement"]] = relationship(back_populates="medicine")
    order_items: Mapped[list["PharmacyOrderItem"]] = relationship(back_populates="medicine")


class PharmacyStockMovement(Base):
    __tablename__ = "pharmacy_stock_movements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    medicine_id: Mapped[int] = mapped_column(ForeignKey("pharmacy_medicines.id"), index=True)
    movement_type: Mapped[StockMovementType] = mapped_column(
        Enum(StockMovementType, name="pharmacy_stock_movement_type", native_enum=False),
        nullable=False,
    )
    qty: Mapped[int] = mapped_column(Integer, nullable=False)
    ref_type: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    ref_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    medicine: Mapped["PharmacyMedicine"] = relationship(back_populates="movements")


class PharmacyOrder(Base):
    __tablename__ = "pharmacy_orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_number: Mapped[str] = mapped_column(String(40), unique=True, nullable=False, index=True)
    patient_id: Mapped[Optional[int]] = mapped_column(ForeignKey("patients.id"), nullable=True, index=True)
    prescription_id: Mapped[Optional[int]] = mapped_column(ForeignKey("prescriptions.id"), nullable=True, index=True)
    status: Mapped[PharmacyOrderStatus] = mapped_column(
        Enum(PharmacyOrderStatus, name="pharmacy_order_status", native_enum=False),
        default=PharmacyOrderStatus.pending,
        index=True,
    )
    total_amount: Mapped[float] = mapped_column(Float, default=0.0)
    payment_status: Mapped[PharmacyPaymentStatus] = mapped_column(
        Enum(PharmacyPaymentStatus, name="pharmacy_payment_status", native_enum=False),
        default=PharmacyPaymentStatus.unpaid,
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    dispensed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    items: Mapped[list["PharmacyOrderItem"]] = relationship(
        back_populates="order", cascade="all, delete-orphan"
    )


class PharmacyOrderItem(Base):
    __tablename__ = "pharmacy_order_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("pharmacy_orders.id", ondelete="CASCADE"), index=True)
    medicine_id: Mapped[int] = mapped_column(ForeignKey("pharmacy_medicines.id"), index=True)
    qty: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[float] = mapped_column(Float, nullable=False)
    line_total: Mapped[float] = mapped_column(Float, nullable=False)

    order: Mapped["PharmacyOrder"] = relationship(back_populates="items")
    medicine: Mapped["PharmacyMedicine"] = relationship(back_populates="order_items")
