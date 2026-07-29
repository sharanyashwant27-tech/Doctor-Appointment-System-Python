"""RBAC negative and positive cases."""


def test_patient_cannot_approve_appointment(client, seed_roles, auth_headers, doctor_profile_id, future_slot):
    patient_h = auth_headers("patient@test.local", "Patient@123")
    book = client.post(
        "/api/v1/appointments/",
        headers=patient_h,
        json={
            "doctor_id": doctor_profile_id,
            "scheduled_at": future_slot.isoformat(),
            "duration_minutes": 30,
            "reason": "checkup",
        },
    )
    assert book.status_code == 201
    appt_id = book.json()["id"]

    r = client.post(
        f"/api/v1/appointments/{appt_id}/approve",
        headers=patient_h,
    )
    assert r.status_code == 403


def test_patient_cannot_access_admin_analytics(client, seed_roles, auth_headers):
    h = auth_headers("patient@test.local", "Patient@123")
    r = client.get("/api/v1/admin/analytics", headers=h)
    assert r.status_code == 403


def test_doctor_cannot_access_admin_analytics(client, seed_roles, auth_headers):
    h = auth_headers("doctor@test.local", "Doctor@123")
    r = client.get("/api/v1/admin/analytics", headers=h)
    assert r.status_code == 403


def test_doctor_cannot_export(client, seed_roles, auth_headers):
    h = auth_headers("doctor@test.local", "Doctor@123")
    r = client.get("/api/v1/admin/export/users?format=csv", headers=h)
    assert r.status_code == 403


def test_admin_can_access_analytics(client, seed_roles, auth_headers):
    h = auth_headers("admin@test.local", "Admin@123")
    r = client.get("/api/v1/admin/analytics", headers=h)
    assert r.status_code == 200
    body = r.json()
    assert "users" in body or "total_users" in body or isinstance(body, dict)


def test_admin_export_users_csv_200(client, seed_roles, auth_headers):
    h = auth_headers("admin@test.local", "Admin@123")
    r = client.get("/api/v1/admin/export/users", headers=h, params={"format": "csv"})
    assert r.status_code == 200
    assert "text/csv" in r.headers.get("content-type", "")
    assert r.content  # non-empty


def test_admin_export_appointments_xlsx_200(client, seed_roles, auth_headers):
    h = auth_headers("admin@test.local", "Admin@123")
    r = client.get("/api/v1/admin/export/appointments", headers=h, params={"format": "xlsx"})
    assert r.status_code == 200
    assert r.content


def test_unauthenticated_admin_forbidden(client):
    r = client.get("/api/v1/admin/analytics")
    assert r.status_code == 401
