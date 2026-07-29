# MediBook Public API

Canonical product REST surface (also listed in Swagger under **public-api**).

Base URL: `http://localhost:8000` · App UI proxies `/api` from `:8905`.

## Authentication

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/register` | Register patient or doctor |
| POST | `/api/login` | JWT login (access + refresh) |
| POST | `/api/logout` | Revoke refresh token |
| POST | `/api/forgot-password` | Start password reset |

## Doctors

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/doctors` | List / search doctors |
| GET | `/api/doctor/{id}` | Doctor profile |
| POST | `/api/doctor` | Create doctor (admin) |
| PUT | `/api/doctor` | Update current doctor profile |
| DELETE | `/api/doctor` | Deactivate doctor (`?id=` for admin) |

## Patients

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/patients` | List patients (admin/doctor) |
| GET | `/api/patient/{id}` | Patient profile |
| POST | `/api/patient` | Create patient (admin) |

## Appointments

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/appointments` | Book appointment |
| GET | `/api/appointments` | List my appointments |
| PUT | `/api/appointments/{id}` | Reschedule / update / cancel via body |
| DELETE | `/api/appointments/{id}` | Cancel appointment |

## Payments

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/payment` | Checkout (+ optional auto-confirm) |
| GET | `/api/payment/history` | Payment history |

## Extended API

Full feature set (2FA, prescriptions, analytics, waiting list, etc.) remains under `/api/v1/...`.
See interactive docs: http://localhost:8000/docs
