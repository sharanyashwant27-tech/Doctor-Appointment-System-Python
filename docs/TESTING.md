# MediBook Testing

## Pytest (backend)

```bash
cd backend
pip install -r requirements.txt
pytest                         # all
pytest -m unit                 # crypto / helpers
pytest -m api                  # HTTP API
pytest -m security             # CSRF / headers
pytest -m integration          # multi-step (markers on demand)
```

| Layer | Location | What |
|-------|----------|------|
| Unit | `tests/unit/` | bcrypt, JWT, CSRF helpers |
| API / integration | `tests/test_*.py` | Auth, RBAC, appointments, payments, public API |
| Security | `tests/test_security.py` | CSRF origin, security headers |

## Load testing (Locust)

```bash
# Seed + run API, then:
cd backend
locust -f load_tests/locustfile.py --host http://127.0.0.1:8000
# UI: http://localhost:8089
```

Headless:

```bash
locust -f load_tests/locustfile.py --host http://127.0.0.1:8000 \
  --users 50 --spawn-rate 5 --run-time 2m --headless
```

Override credentials: `LOAD_EMAIL` / `LOAD_PASSWORD`.

## End-to-end (Playwright)

```bash
# Terminal 1: backend on :8000 (seeded)
# Terminal 2:
cd frontend
npm install
npx playwright install chromium
npm run test:e2e
```

Specs live in `frontend/e2e/`. Set `E2E_SKIP_WEBSERVER=1` if Vite is already running.

## CI

`.github/workflows/ci.yml` runs `pytest` and `npm run build`.
