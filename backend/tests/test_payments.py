"""Payments: mock gateway unit + checkout/confirm API flow."""
from datetime import timedelta

from services.payment_gateway import MockPaymentGateway, UpiPaymentGateway


def test_mock_gateway_success():
    gw = MockPaymentGateway()
    intent = gw.create_payment(100.0)
    result = gw.confirm(intent.gateway_ref)
    assert result.status == "success"


def test_mock_gateway_force_fail():
    gw = MockPaymentGateway()
    intent = gw.create_payment(50.0)
    result = gw.confirm(intent.gateway_ref, meta={"force_fail": True})
    assert result.status == "failed"


def test_upi_gateway_intent_link():
    gw = UpiPaymentGateway()
    intent = gw.create_payment(250.0, meta={"appointment_id": 9})
    assert intent.upi_vpa
    assert intent.upi_link and intent.upi_link.startswith("upi://pay?")
    assert "am=250.00" in intent.upi_link
    assert gw.confirm(intent.gateway_ref, meta={"upi_reference": "ABC"}).status == "success"


def test_payments_list_requires_auth(client):
    r = client.get("/api/v1/payments/")
    assert r.status_code == 401


def _book_and_approve(client, auth_headers, doctor_profile_id, future_slot):
    patient_h = auth_headers("patient@test.local", "Patient@123")
    doctor_h = auth_headers("doctor@test.local", "Doctor@123")
    book = client.post(
        "/api/v1/appointments/",
        headers=patient_h,
        json={
            "doctor_id": doctor_profile_id,
            "scheduled_at": future_slot.isoformat(),
            "duration_minutes": 30,
            "reason": "payment flow",
        },
    )
    assert book.status_code == 201, book.text
    appt_id = book.json()["id"]
    approved = client.post(f"/api/v1/appointments/{appt_id}/approve", headers=doctor_h)
    assert approved.status_code == 200, approved.text
    return patient_h, appt_id


def test_checkout_requires_approved_appointment(
    client, seed_roles, auth_headers, doctor_profile_id, future_slot
):
    patient_h = auth_headers("patient@test.local", "Patient@123")
    book = client.post(
        "/api/v1/appointments/",
        headers=patient_h,
        json={
            "doctor_id": doctor_profile_id,
            "scheduled_at": future_slot.isoformat(),
            "duration_minutes": 30,
        },
    )
    appt_id = book.json()["id"]
    r = client.post(
        "/api/v1/payments/checkout",
        headers=patient_h,
        json={"appointment_id": appt_id, "currency": "INR"},
    )
    assert r.status_code == 422


def test_checkout_and_confirm_success(
    client, seed_roles, auth_headers, doctor_profile_id, future_slot
):
    patient_h, appt_id = _book_and_approve(client, auth_headers, doctor_profile_id, future_slot)

    checkout = client.post(
        "/api/v1/payments/checkout",
        headers=patient_h,
        json={"appointment_id": appt_id, "currency": "INR"},
    )
    assert checkout.status_code == 200, checkout.text
    payment = checkout.json()
    assert payment["status"] == "pending"
    assert payment["appointment_id"] == appt_id
    assert payment["gateway_ref"]
    assert float(payment["amount"]) == 750.0
    assert payment.get("upi_vpa")
    assert payment.get("upi_link", "").startswith("upi://pay")

    confirm = client.post(
        "/api/v1/payments/confirm",
        headers=patient_h,
        json={"payment_id": payment["id"], "force_fail": False, "upi_reference": "UTRTEST001"},
    )
    assert confirm.status_code == 200, confirm.text
    confirmed = confirm.json()
    assert confirmed["status"] == "success"
    assert confirmed["invoice_number"]
    assert confirmed["paid_at"] is not None


def test_checkout_after_reschedule(
    client, seed_roles, auth_headers, doctor_profile_id, future_slot
):
    """Rescheduled appointments are payable."""
    patient_h = auth_headers("patient@test.local", "Patient@123")
    book = client.post(
        "/api/v1/appointments/",
        headers=patient_h,
        json={
            "doctor_id": doctor_profile_id,
            "scheduled_at": future_slot.isoformat(),
            "duration_minutes": 30,
        },
    )
    appt_id = book.json()["id"]
    new_time = future_slot + timedelta(days=2)
    res = client.post(
        f"/api/v1/appointments/{appt_id}/reschedule",
        headers=patient_h,
        json={"scheduled_at": new_time.isoformat()},
    )
    assert res.status_code == 200
    assert res.json()["status"] == "rescheduled"

    checkout = client.post(
        "/api/v1/payments/checkout",
        headers=patient_h,
        json={"appointment_id": appt_id},
    )
    assert checkout.status_code == 200
    assert checkout.json()["status"] == "pending"
