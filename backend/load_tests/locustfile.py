"""
Locust load test for MediBook API.

Run (backend must be up on :8000):
  cd backend
  locust -f load_tests/locustfile.py --host http://127.0.0.1:8000

Headless example:
  locust -f load_tests/locustfile.py --host http://127.0.0.1:8000 \\
    --users 50 --spawn-rate 5 --run-time 2m --headless
"""
from __future__ import annotations

import os
import random

from locust import HttpUser, between, task


class MediBookUser(HttpUser):
    wait_time = between(0.5, 2.0)

    email = os.getenv("LOAD_EMAIL", "patient1@medibook.local")
    password = os.getenv("LOAD_PASSWORD", "Patient@123")
    token: str | None = None

    def on_start(self) -> None:
        with self.client.post(
            "/api/login",
            json={"email": self.email, "password": self.password},
            catch_response=True,
            name="POST /api/login",
        ) as resp:
            if resp.status_code == 200:
                self.token = resp.json().get("access_token")
                resp.success()
            else:
                resp.failure(f"login failed: {resp.status_code}")

    def _auth(self) -> dict[str, str]:
        if not self.token:
            return {}
        return {"Authorization": f"Bearer {self.token}"}

    @task(5)
    def health(self) -> None:
        self.client.get("/health", name="GET /health")

    @task(3)
    def list_doctors(self) -> None:
        self.client.get("/api/doctors", headers=self._auth(), name="GET /api/doctors")

    @task(2)
    def me(self) -> None:
        self.client.get("/api/v1/auth/me", headers=self._auth(), name="GET /api/v1/auth/me")

    @task(1)
    def appointments(self) -> None:
        self.client.get(
            "/api/appointments",
            headers=self._auth(),
            name="GET /api/appointments",
            params={"limit": random.choice([10, 20])},
        )
