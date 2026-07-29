"""API tests for advanced features."""
from __future__ import annotations

import pytest


pytestmark = [pytest.mark.api]


def test_symptom_checker(client, seed_roles, auth_headers):
    h = auth_headers("patient@test.local", "Patient@123")
    r = client.post("/api/v1/advanced/symptoms/check", json={"symptoms": "chest pain and palpitations"}, headers=h)
    assert r.status_code == 200
    data = r.json()
    assert data["primary"]["specialty"] == "Cardiology"


def test_recommendations(client, seed_roles, auth_headers):
    h = auth_headers("patient@test.local", "Patient@123")
    r = client.post(
        "/api/v1/advanced/recommendations",
        json={"symptoms": "skin rash acne", "limit": 3},
        headers=h,
    )
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_face_enroll_and_login(client, seed_roles, auth_headers):
    h = auth_headers("patient@test.local", "Patient@123")
    sample = "face-descriptor-" + ("x" * 64)
    assert client.post("/api/v1/advanced/face/enroll", json={"image_b64": sample}, headers=h).status_code == 200
    login = client.post("/api/v1/advanced/face/login", json={"image_b64": sample})
    assert login.status_code == 200
    assert "access_token" in login.json()


def test_medicine_reminder(client, seed_roles, auth_headers):
    h = auth_headers("patient@test.local", "Patient@123")
    r = client.post(
        "/api/v1/advanced/reminders",
        json={"medicine_name": "Amlodipine", "schedule_time": "09:00:00", "dosage": "5mg"},
        headers=h,
    )
    assert r.status_code == 201
    listed = client.get("/api/v1/advanced/reminders", headers=h)
    assert listed.status_code == 200
    assert len(listed.json()) >= 1


def test_doctor_review(client, seed_roles, auth_headers, doctor_profile_id):
    h = auth_headers("patient@test.local", "Patient@123")
    r = client.post(
        "/api/v1/advanced/reviews",
        json={"doctor_id": doctor_profile_id, "rating": 5, "comment": "Excellent"},
        headers=h,
    )
    assert r.status_code == 201
    reviews = client.get(f"/api/v1/advanced/reviews/{doctor_profile_id}")
    assert reviews.status_code == 200
    assert len(reviews.json()) >= 1


def test_chat_thread(client, seed_roles, auth_headers, doctor_profile_id):
    ph = auth_headers("patient@test.local", "Patient@123")
    thread = client.post("/api/v1/advanced/chat/threads", json={"doctor_id": doctor_profile_id}, headers=ph)
    assert thread.status_code == 201
    tid = thread.json()["id"]
    msg = client.post(f"/api/v1/advanced/chat/threads/{tid}/messages", json={"body": "Hello doctor"}, headers=ph)
    assert msg.status_code == 201
    dh = auth_headers("doctor@test.local", "Doctor@123")
    reply = client.post(f"/api/v1/advanced/chat/threads/{tid}/messages", json={"body": "Hello patient"}, headers=dh)
    assert reply.status_code == 201


def test_hospital_admin(client, seed_roles, auth_headers):
    h = auth_headers("admin@test.local", "Admin@123")
    r = client.post(
        "/api/v1/advanced/hospitals",
        json={"name": "Test Hospital", "code": "TH1", "city": "Pune"},
        headers=h,
    )
    assert r.status_code == 201
    listed = client.get("/api/v1/advanced/hospitals", headers=h)
    assert listed.status_code == 200
    assert any(x["code"] == "TH1" for x in listed.json())


def test_ocr_and_assistant(client, seed_roles, auth_headers):
    h = auth_headers("patient@test.local", "Patient@123")
    ocr = client.post(
        "/api/v1/advanced/ocr/scan",
        json={"filename": "labs.pdf", "raw_text": "Hemoglobin: 14.1\nGlucose fasting: 102"},
        headers=h,
    )
    assert ocr.status_code == 201
    assert "hemoglobin" in ocr.json()["findings"]["labs"]
    assist = client.post("/api/v1/advanced/assistant/chat", json={"message": "I have a bad headache"}, headers=h)
    assert assist.status_code == 200
    assert "reply" in assist.json()


def test_voice_parse(client, seed_roles, auth_headers):
    h = auth_headers("patient@test.local", "Patient@123")
    r = client.post(
        "/api/v1/advanced/voice/parse",
        json={"transcript": "Book me with Dr Anita tomorrow for chest pain"},
        headers=h,
    )
    assert r.status_code == 200
    assert r.json()["suggested_specialty"] == "Cardiology"
