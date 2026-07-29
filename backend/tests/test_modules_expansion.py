"""Module expansion coverage — auth reset, waiting list, no-show, refund, analytics."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone


def test_forgot_and_reset_password(client, make_user):
    make_user(email="resetme@test.local", password="OldPassw0rd!")
    r = client.post("/api/v1/auth/forgot-password", json={"email": "resetme@test.local"})
    assert r.status_code == 200
    token = r.json().get("dev_token")
    assert token
    reset = client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "NewPassw0rd!"},
    )
    assert reset.status_code == 200
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "resetme@test.local", "password": "NewPassw0rd!"},
    )
    assert login.status_code == 200


def test_waiting_list_and_no_show(client, auth_headers, seed_roles, doctor_profile_id):
    patient_h = auth_headers("patient@test.local", "Patient@123")
    doctor_h = auth_headers("doctor@test.local", "Doctor@123")

    wait = client.post(
        "/api/v1/waiting-list/",
        headers=patient_h,
        json={"doctor_id": doctor_profile_id, "notes": "Prefer morning"},
    )
    assert wait.status_code == 200, wait.text
    assert wait.json()["status"] == "waiting"

    book = client.post(
        "/api/v1/appointments/",
        headers=patient_h,
        json={
            "doctor_id": doctor_profile_id,
            "scheduled_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
            "reason": "checkup",
        },
    )
    assert book.status_code == 201, book.text
    appt_id = book.json()["id"]
    assert book.json().get("qr_token")
    assert book.json().get("token_number")

    approve = client.post(f"/api/v1/appointments/{appt_id}/approve", headers=doctor_h)
    assert approve.status_code == 200

    no_show = client.post(f"/api/v1/appointments/{appt_id}/no-show", headers=doctor_h)
    assert no_show.status_code == 200
    assert no_show.json()["status"] == "no_show"


def test_analytics_has_peak_hours(client, auth_headers, seed_roles):
    admin_h = auth_headers("admin@test.local", "Admin@123")
    r = client.get("/api/v1/admin/analytics", headers=admin_h)
    assert r.status_code == 200
    body = r.json()
    assert "peak_hours" in body
    assert "doctor_performance" in body
    assert "patient_visits" in body


def test_refund_flow(client, auth_headers, seed_roles, doctor_profile_id):
    patient_h = auth_headers("patient@test.local", "Patient@123")
    doctor_h = auth_headers("doctor@test.local", "Doctor@123")

    book = client.post(
        "/api/v1/appointments/",
        headers=patient_h,
        json={
            "doctor_id": doctor_profile_id,
            "scheduled_at": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
        },
    )
    assert book.status_code == 201, book.text
    appt_id = book.json()["id"]
    client.post(f"/api/v1/appointments/{appt_id}/approve", headers=doctor_h)
    checkout = client.post("/api/v1/payments/checkout", headers=patient_h, json={"appointment_id": appt_id})
    assert checkout.status_code == 200, checkout.text
    payment_id = checkout.json()["id"]
    confirm = client.post("/api/v1/payments/confirm", headers=patient_h, json={"payment_id": payment_id})
    assert confirm.status_code == 200
    refund = client.post(f"/api/v1/payments/{payment_id}/refund", headers=patient_h)
    assert refund.status_code == 200, refund.text
    assert refund.json()["status"] == "refunded"
