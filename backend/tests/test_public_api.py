"""Public REST design endpoints (`/api/...`)."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone


def test_public_auth_register_login_logout(client):
    reg = client.post(
        "/api/register",
        json={
            "email": "pubuser@test.local",
            "password": "Passw0rd!",
            "full_name": "Public User",
            "role": "patient",
        },
    )
    assert reg.status_code == 201, reg.text

    login = client.post("/api/login", json={"email": "pubuser@test.local", "password": "Passw0rd!"})
    assert login.status_code == 200, login.text
    refresh = login.json()["refresh_token"]

    out = client.post("/api/logout", json={"refresh_token": refresh})
    assert out.status_code == 200


def test_public_forgot_password(client, make_user):
    make_user(email="pubforgot@test.local", password="Passw0rd!")
    r = client.post("/api/forgot-password", json={"email": "pubforgot@test.local"})
    assert r.status_code == 200
    assert "message" in r.json()


def test_public_doctors_patients_appointments_payment(client, auth_headers, seed_roles, doctor_profile_id):
    # List doctors (public)
    docs = client.get("/api/doctors")
    assert docs.status_code == 200
    assert isinstance(docs.json(), list)

    one = client.get(f"/api/doctor/{doctor_profile_id}")
    assert one.status_code == 200
    assert one.json()["id"] == doctor_profile_id

    patient_h = auth_headers("patient@test.local", "Patient@123")
    doctor_h = auth_headers("doctor@test.local", "Doctor@123")
    admin_h = auth_headers("admin@test.local", "Admin@123")

    patients = client.get("/api/patients", headers=admin_h)
    assert patients.status_code == 200

    patient_id = seed_roles["patient"].patient_profile.id
    got = client.get(f"/api/patient/{patient_id}", headers=patient_h)
    assert got.status_code == 200

    book = client.post(
        "/api/appointments",
        headers=patient_h,
        json={
            "doctor_id": doctor_profile_id,
            "scheduled_at": (datetime.now(timezone.utc) + timedelta(days=4)).isoformat(),
            "reason": "public api book",
        },
    )
    assert book.status_code == 201, book.text
    appt_id = book.json()["id"]

    listed = client.get("/api/appointments", headers=patient_h)
    assert listed.status_code == 200
    assert any(a["id"] == appt_id for a in listed.json())

    # Approve via v1 so payment can proceed
    client.post(f"/api/v1/appointments/{appt_id}/approve", headers=doctor_h)

    pay = client.post(
        "/api/payment",
        headers=patient_h,
        json={"appointment_id": appt_id, "confirm": True},
    )
    assert pay.status_code == 200, pay.text
    assert pay.json()["status"] == "success"

    history = client.get("/api/payment/history", headers=patient_h)
    assert history.status_code == 200
    assert any(p["appointment_id"] == appt_id for p in history.json())

    # Reschedule another appointment then delete/cancel
    book2 = client.post(
        "/api/appointments",
        headers=patient_h,
        json={
            "doctor_id": doctor_profile_id,
            "scheduled_at": (datetime.now(timezone.utc) + timedelta(days=5)).isoformat(),
        },
    )
    appt2 = book2.json()["id"]
    upd = client.put(
        f"/api/appointments/{appt2}",
        headers=patient_h,
        json={"scheduled_at": (datetime.now(timezone.utc) + timedelta(days=6)).isoformat()},
    )
    assert upd.status_code == 200, upd.text

    deleted = client.delete(f"/api/appointments/{appt2}", headers=patient_h)
    assert deleted.status_code == 200
    assert deleted.json()["status"] == "cancelled"
