"""Appointments: book, double-book conflict, approve, cancel, reschedule."""
from datetime import timedelta


def test_list_appointments_empty(client, seed_roles, auth_headers):
    h = auth_headers("patient@test.local", "Patient@123")
    r = client.get("/api/v1/appointments/", headers=h)
    assert r.status_code == 200
    assert r.json() == []


def test_book_appointment(client, seed_roles, auth_headers, doctor_profile_id, future_slot):
    h = auth_headers("patient@test.local", "Patient@123")
    r = client.post(
        "/api/v1/appointments/",
        headers=h,
        json={
            "doctor_id": doctor_profile_id,
            "scheduled_at": future_slot.isoformat(),
            "duration_minutes": 30,
            "reason": "chest pain",
        },
    )
    assert r.status_code == 201
    data = r.json()
    assert data["status"] == "pending"
    assert data["doctor_id"] == doctor_profile_id
    assert data["reason"] == "chest pain"


def test_double_book_conflict(client, seed_roles, auth_headers, doctor_profile_id, future_slot):
    h1 = auth_headers("patient@test.local", "Patient@123")
    h2 = auth_headers("patient2@test.local", "Patient@123")
    payload = {
        "doctor_id": doctor_profile_id,
        "scheduled_at": future_slot.isoformat(),
        "duration_minutes": 30,
        "reason": "first",
    }
    first = client.post("/api/v1/appointments/", headers=h1, json=payload)
    assert first.status_code == 201

    second = client.post(
        "/api/v1/appointments/",
        headers=h2,
        json={
            "doctor_id": doctor_profile_id,
            "scheduled_at": (future_slot + timedelta(minutes=10)).isoformat(),
            "duration_minutes": 30,
            "reason": "overlap",
        },
    )
    assert second.status_code == 409
    assert second.json()["code"] == "conflict"


def test_approve_appointment(client, seed_roles, auth_headers, doctor_profile_id, future_slot):
    patient_h = auth_headers("patient@test.local", "Patient@123")
    doctor_h = auth_headers("doctor@test.local", "Doctor@123")
    book = client.post(
        "/api/v1/appointments/",
        headers=patient_h,
        json={
            "doctor_id": doctor_profile_id,
            "scheduled_at": future_slot.isoformat(),
            "duration_minutes": 30,
        },
    )
    assert book.status_code == 201
    appt_id = book.json()["id"]

    approved = client.post(f"/api/v1/appointments/{appt_id}/approve", headers=doctor_h)
    assert approved.status_code == 200
    assert approved.json()["status"] == "approved"


def test_cancel_appointment(client, seed_roles, auth_headers, doctor_profile_id, future_slot):
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

    cancelled = client.post(
        f"/api/v1/appointments/{appt_id}/cancel",
        headers=patient_h,
        json={"cancel_reason": "feeling better"},
    )
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"
    assert cancelled.json()["cancel_reason"] == "feeling better"


def test_reschedule_appointment(client, seed_roles, auth_headers, doctor_profile_id, future_slot):
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
    new_time = future_slot + timedelta(days=1)

    res = client.post(
        f"/api/v1/appointments/{appt_id}/reschedule",
        headers=patient_h,
        json={"scheduled_at": new_time.isoformat()},
    )
    assert res.status_code == 200
    assert res.json()["status"] == "rescheduled"


def test_patient_cannot_book_without_auth(client, doctor_profile_id, future_slot, seed_roles):
    r = client.post(
        "/api/v1/appointments/",
        json={
            "doctor_id": doctor_profile_id,
            "scheduled_at": future_slot.isoformat(),
            "duration_minutes": 30,
        },
    )
    assert r.status_code == 401
