# Pharmacy Management

Admin-operated clinic pharmacy linked to doctor prescriptions. No separate pharmacist login role.

## Roles

| Role | Access |
|------|--------|
| **Admin** | Inventory CRUD, suppliers, stock purchase/adjust, dispense from Rx, walk-in POS, orders, stats |
| **Doctor** | Read-only medicine stock search + low-stock view |
| **Patient** | Request fulfillment for own prescriptions; view pharmacy order status |

## UI

- Admin: `/admin/pharmacy`
- Doctor: `/doctor/pharmacy`
- Patient: `/patient/pharmacy`

## API (`/api/v1/pharmacy`)

| Method | Path | Who |
|--------|------|-----|
| GET | `/stats` | Admin |
| GET/POST | `/suppliers` | Admin |
| PATCH | `/suppliers/{id}` | Admin |
| GET | `/medicines` | Admin, Doctor |
| POST/PATCH | `/medicines`, `/medicines/{id}` | Admin |
| POST | `/stock/purchase`, `/stock/adjust` | Admin |
| GET | `/orders` | Admin, Doctor, Patient (own) |
| GET | `/prescriptions/{id}/match` | Admin |
| POST | `/orders/from-prescription` | Admin |
| POST | `/orders/walk-in` | Admin |
| POST | `/orders/request` | Patient |
| POST | `/orders/{id}/dispense` | Admin |

## Tables

`pharmacy_suppliers`, `pharmacy_medicines`, `pharmacy_stock_movements`, `pharmacy_orders`, `pharmacy_order_items`

Seed: `ensure_pharmacy()` loads ~12 common medicines (incl. Amlodipine / Aspirin) and two suppliers.
