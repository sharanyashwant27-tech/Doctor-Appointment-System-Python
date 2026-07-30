"""Pharmacy inventory + dispense API tests."""
from datetime import timedelta


def test_pharmacy_medicines_require_auth(client):
    assert client.get("/api/v1/pharmacy/medicines").status_code == 401


def test_patient_cannot_create_medicine(client, seed_roles, auth_headers):
    patient_h = auth_headers("patient@test.local", "Patient@123")
    r = client.post(
        "/api/v1/pharmacy/medicines",
        headers=patient_h,
        json={"sku": "X1", "name": "X", "mrp": 10},
    )
    assert r.status_code == 403


def test_pharmacy_purchase_and_walk_in(client, seed_roles, auth_headers):
    admin_h = auth_headers("admin@test.local", "Admin@123")
    create = client.post(
        "/api/v1/pharmacy/medicines",
        headers=admin_h,
        json={
            "sku": "TEST-PCM",
            "name": "Test Paracetamol",
            "mrp": 12.0,
            "cost_price": 5.0,
            "stock_qty": 0,
            "reorder_level": 10,
        },
    )
    assert create.status_code == 201, create.text
    mid = create.json()["id"]
    assert create.json()["stock_qty"] == 0

    purchase = client.post(
        "/api/v1/pharmacy/stock/purchase",
        headers=admin_h,
        json={"medicine_id": mid, "qty": 50, "unit_cost": 5.5},
    )
    assert purchase.status_code == 200, purchase.text
    assert purchase.json()["stock_qty"] == 50

    sale = client.post(
        "/api/v1/pharmacy/orders/walk-in",
        headers=admin_h,
        json={
            "items": [{"medicine_id": mid, "qty": 5}],
            "customer_name": "Walk-in Guest",
            "mark_paid": True,
        },
    )
    assert sale.status_code == 201, sale.text
    assert sale.json()["status"] == "dispensed"
    assert float(sale.json()["total_amount"]) == 60.0

    med = client.get(f"/api/v1/pharmacy/medicines/{mid}", headers=admin_h)
    assert med.json()["stock_qty"] == 45


def test_dispense_from_prescription_and_patient_request(
    client, seed_roles, auth_headers, doctor_profile_id, future_slot
):
    admin_h = auth_headers("admin@test.local", "Admin@123")
    patient_h = auth_headers("patient@test.local", "Patient@123")
    doctor_h = auth_headers("doctor@test.local", "Doctor@123")

    # Ensure catalog meds
    for sku, name, mrp in [("AML-T", "Amlodipine", 40.0), ("ASP-T", "Aspirin", 15.0)]:
        existing = client.get("/api/v1/pharmacy/medicines", headers=admin_h, params={"q": name})
        if not any(m["sku"] == sku for m in existing.json()):
            c = client.post(
                "/api/v1/pharmacy/medicines",
                headers=admin_h,
                json={"sku": sku, "name": name, "mrp": mrp, "stock_qty": 100, "requires_prescription": True},
            )
            assert c.status_code == 201, c.text

    book = client.post(
        "/api/v1/appointments/",
        headers=patient_h,
        json={
            "doctor_id": doctor_profile_id,
            "scheduled_at": future_slot.isoformat(),
            "duration_minutes": 30,
            "reason": "pharmacy rx",
        },
    )
    assert book.status_code == 201, book.text
    appt_id = book.json()["id"]
    assert client.post(f"/api/v1/appointments/{appt_id}/approve", headers=doctor_h).status_code == 200
    assert client.post(f"/api/v1/appointments/{appt_id}/complete", headers=doctor_h, json={"notes": "ok"}).status_code == 200

    rec = client.post(
        "/api/v1/medical-records/",
        headers=doctor_h,
        json={"appointment_id": appt_id, "diagnosis": "HTN", "notes": "rx"},
    )
    assert rec.status_code == 201, rec.text
    rx = client.post(
        f"/api/v1/medical-records/{rec.json()['id']}/prescriptions",
        headers=doctor_h,
        json={
            "medicines": [
                {"name": "Amlodipine", "dose": "5mg", "frequency": "OD", "duration": "30d"},
                {"name": "Aspirin", "dose": "75mg", "frequency": "OD", "duration": "30d"},
            ],
            "instructions": "after food",
        },
    )
    assert rx.status_code == 201, rx.text
    # prescriptions nested on record
    rec2 = client.get(f"/api/v1/medical-records/{rec.json()['id']}", headers=doctor_h)
    prescriptions = rec2.json().get("prescriptions") or []
    assert prescriptions, rec2.text
    rx_id = prescriptions[0]["id"]

    req = client.post(
        "/api/v1/pharmacy/orders/request",
        headers=patient_h,
        json={"prescription_id": rx_id},
    )
    assert req.status_code == 201, req.text
    assert req.json()["status"] == "pending"
    order_id = req.json()["id"]

    # Patient cannot dispense
    assert client.post(f"/api/v1/pharmacy/orders/{order_id}/dispense", headers=patient_h).status_code == 403

    disp = client.post(f"/api/v1/pharmacy/orders/{order_id}/dispense", headers=admin_h)
    assert disp.status_code == 200, disp.text
    assert disp.json()["status"] == "dispensed"

    # Doctor can list medicines
    docs = client.get("/api/v1/pharmacy/medicines", headers=doctor_h, params={"low_stock": False})
    assert docs.status_code == 200
    assert len(docs.json()) >= 1

    stats = client.get("/api/v1/pharmacy/stats", headers=admin_h)
    assert stats.status_code == 200
    assert "low_stock_count" in stats.json()
