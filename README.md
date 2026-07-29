# MediBook — Doctor Appointment System

**Repository:** [sharanyashwant27-tech/Doctor-Appointment-System-Python](https://github.com/sharanyashwant27-tech/Doctor-Appointment-System-Python)

**Stack:** Python 3.13+ · FastAPI · SQLAlchemy · PostgreSQL/SQLite · JWT · Celery · React (Vite) · Material UI · Docker

See [docs/DATABASE.md](docs/DATABASE.md) for the canonical schema (`users`, `doctors`, `patients`, `appointments`, `prescriptions`, `payments`).

| Layer | Technologies |
|-------|----------------|
| **Backend** | Python 3.13+, FastAPI, SQLAlchemy, Pydantic, JWT auth, Alembic, Celery, Redis, Uvicorn |
| **Frontend** | React, Vite, Material UI, Axios, React Router, React Hook Form |
| **Database** | PostgreSQL (production / Docker) or SQLite (local development) |
| **Reports** | Pandas, ReportLab (+ OpenPyXL for Excel) |
| **Notifications** | SMTP email, Twilio SMS, Firebase push (optional) |
| **Deployment** | Docker, Docker Compose, Nginx |

## Project structure

```
Doctor-Appointment-System-Python/
├── backend/                 # FastAPI API (Dockerfile builds from repo root)
├── frontend/                # React + Vite UI (Nginx image)
├── docs/                    # API, database, security, testing, advanced
├── scripts/                 # TLS cert helpers
├── docker-compose.yml       # Full stack (db, redis, api, worker, beat, ui)
├── docker-compose.https.yml # Optional TLS overlay
├── Dockerfile               # Convenience API image
├── .env.example
└── README.md
```

## Hosting (localhost:8905)

| Surface | URL |
|--------|-----|
| App | http://localhost:8905 |
| Swagger / OpenAPI | http://localhost:8000/docs |
| Health | http://localhost:8000/health |

## Docker (recommended)

Images include this **README.md** (and `docs/` on the API image) and OCI labels pointing at the GitHub repo.

### Full stack

```bash
# optional: customize env
cp .env.example .env   # macOS/Linux
# copy .env.example .env   # Windows

docker compose up --build
```

| Service | Image | Port |
|---------|-------|------|
| `frontend` | `medibook-frontend:latest` | **8905** → 80 |
| `backend` | `medibook-backend:latest` | **8000** |
| `worker` / `beat` | `medibook-backend:latest` | — |
| `db` | `postgres:16-alpine` | 5432 |
| `redis` | `redis:7-alpine` | 6379 |

- App: **http://localhost:8905** · API docs: **http://localhost:8000/docs**
- Backend entrypoint runs `python -m database.seed` on start (idempotent).
- Compose sets Postgres + Redis and `CELERY_TASK_ALWAYS_EAGER=false`.
- Set a strong `SECRET_KEY` in `.env` before shared/production use.

### Build images individually

```bash
# From repository root
docker build -f backend/Dockerfile -t medibook-backend:latest .
docker build -f frontend/Dockerfile -t medibook-frontend:latest .
docker build -t medibook:latest .   # API-only convenience image
```

Verify README is inside the image:

```bash
docker run --rm medibook-backend:latest cat /app/README.md | head
docker run --rm medibook-frontend:latest cat /usr/share/nginx/html/README.md | head
```

### HTTPS (optional)

```powershell
powershell -File scripts/generate-dev-certs.ps1
docker compose -f docker-compose.yml -f docker-compose.https.yml up --build
```

## Quick start (local — SQLite + Vite)

### 1. Backend

Requires **Python 3.13+**.

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python -m database.seed
uvicorn main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:8905**.

### Demo credentials (after seed)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@medibook.local | Admin@123 |
| Doctor (any specialty) | doctor1@…, medicine1@…, cardio2@…, etc. | Doctor@123 |
| Patient | patient1@medibook.local | Patient@123 |
| Patient | patient2@medibook.local | Patient@123 |

Specialty catalog (~31 doctors / 19 departments): Cardiology, General/Internal Medicine, Dermatology, Orthopedics, Neurology, Pediatrics, Gynecology/Obstetrics, ENT, Ophthalmology, Gastroenterology, Pulmonology, Psychiatry, Urology, Oncology, Endocrinology, Nephrology, Dentistry.

```bash
python -m database.seed
# full rebuild:
python -c "from database.seed import run_seed; run_seed(reset=True)"
```

## Features

- JWT access + refresh tokens (hashed refresh `jti` in DB), bcrypt passwords, RBAC
- CSRF origin checks + optional double-submit token; auth rate limiting middleware
- HTTPS-ready Nginx profile + security headers
- Doctor search by specialty category, availability, book / approve / reject / cancel / reschedule / complete
- Medical records & prescriptions (PDF download)
- Mock payment checkout/confirm (Stripe/Razorpay stubs) + invoice PDF
- In-app notifications; Celery reminders via SMTP / Twilio SMS / optional Firebase push
- Admin analytics charts; Pandas CSV/XLSX + ReportLab PDF exports; audit logs
- Advanced: symptom AI, voice booking, face login, Jitsi video, chat, OCR, medicine reminders, ratings, insurance, calendar sync, e-sign, certificates, multi-hospital
- Vibrant green MUI theme (light/dark)

## Documentation

| Doc | Path |
|-----|------|
| Public REST API | [docs/API.md](docs/API.md) |
| Database | [docs/DATABASE.md](docs/DATABASE.md) |
| Security | [docs/SECURITY.md](docs/SECURITY.md) |
| Testing | [docs/TESTING.md](docs/TESTING.md) |
| Advanced features | [docs/ADVANCED.md](docs/ADVANCED.md) |

- Swagger UI: http://localhost:8000/docs
- Extended routers: `/api/v1/...`

## Testing

See [docs/TESTING.md](docs/TESTING.md).

```bash
cd backend
pytest
locust -f load_tests/locustfile.py --host http://127.0.0.1:8000
```

```bash
cd frontend
npm run build
npx playwright install chromium
npm run test:e2e
```

CI: `.github/workflows/ci.yml` runs pytest + frontend build.

## Environment variables

See `.env.example` for `SECRET_KEY`, `DATABASE_URL`, Redis/Celery, SMTP, Twilio, Firebase, CORS, CSRF, rate limits, and payment gateway settings.

## Architecture

```
frontend (:8905 / Nginx)  --proxy /api-->  backend (:8000 / Uvicorn main:app)
                                              ├─ routers/ (public + v1 + advanced)
                                              ├─ services / auth / reports / notifications
                                              ├─ models + database (SQLAlchemy + Alembic)
                                              └─ Celery (notifications.celery_app)
```

## License

Private / educational use unless otherwise specified.
