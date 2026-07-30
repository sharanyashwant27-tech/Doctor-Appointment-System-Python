"""Admin create doctor with department."""
from __future__ import annotations


def test_admin_creates_doctor_with_department(client, seed_roles, auth_headers, db_session):
    from models.org import Department

    dept = Department(name="Neurology", description="Brain care", is_active=True)
    db_session.add(dept)
    db_session.commit()
    db_session.refresh(dept)

    admin_h = auth_headers("admin@test.local", "Admin@123")
    r = client.post(
        "/api/v1/admin/doctors",
        headers=admin_h,
        json={
            "email": "newdoc@test.local",
            "password": "Doctor@123",
            "full_name": "Dr New Neuro",
            "department_id": dept.id,
            "consultation_fee": 900,
            "city": "Delhi",
            "qualification": "MD Neurology",
            "experience_years": 8,
            "is_verified": True,
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["specialty"] == "Neurology"
    assert body["department_id"] == dept.id
    assert body["department_name"] == "Neurology"
    assert body["full_name"] == "Dr New Neuro"
    assert body["is_verified"] is True

    login = client.post(
        "/api/v1/auth/login",
        json={"email": "newdoc@test.local", "password": "Doctor@123"},
    )
    assert login.status_code == 200
    token_body = login.json()
    assert token_body.get("access_token")
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token_body['access_token']}"})
    assert me.status_code == 200
    assert me.json()["role"] == "doctor"


def test_non_admin_cannot_create_doctor(client, seed_roles, auth_headers, db_session):
    from models.org import Department

    dept = Department(name="Dermatology", description="Skin", is_active=True)
    db_session.add(dept)
    db_session.commit()
    db_session.refresh(dept)

    patient_h = auth_headers("patient@test.local", "Patient@123")
    r = client.post(
        "/api/v1/admin/doctors",
        headers=patient_h,
        json={
            "email": "blocked@test.local",
            "password": "Doctor@123",
            "full_name": "Blocked",
            "department_id": dept.id,
        },
    )
    assert r.status_code == 403


def test_admin_create_doctor_missing_department(client, seed_roles, auth_headers):
    admin_h = auth_headers("admin@test.local", "Admin@123")
    r = client.post(
        "/api/v1/admin/doctors",
        headers=admin_h,
        json={
            "email": "ghost@test.local",
            "password": "Doctor@123",
            "full_name": "Ghost Doc",
            "department_id": 99999,
        },
    )
    assert r.status_code == 404
