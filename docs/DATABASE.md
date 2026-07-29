# MediBook Database Design

Canonical schema aligned with the product data model. Physical table/column names match the design below; Python attribute names may use clearer aliases (documented in **Mapping**).

## Entity Relationship

```
users 1──1 doctors
users 1──1 patients
patients 1──* appointments *──1 doctors
doctors 1──* availabilities
appointments 1──* payments
appointments 1──* medical_records
medical_records 1──* prescriptions
appointments 1──* prescriptions
```

## Tables

### users
| Column | Type | Notes |
|--------|------|--------|
| id | PK | |
| name | string | API field: `full_name` |
| email | string unique | |
| password | string | Hashed only (API: `hashed_password`) |
| phone | string | |
| role | enum | admin \| doctor \| patient |
| created_at | datetime | |

### doctors
| Column | Type | Notes |
|--------|------|--------|
| id | PK | |
| user_id | FK → users | |
| specialization | string | API: `specialty` |
| experience | int | API: `experience_years` |
| qualification | string | |
| consultation_fee | float | |
| rating | float | API: `rating_avg` |

Availability is normalized in **availabilities** (one doctor → many slots).

### patients
| Column | Type | Notes |
|--------|------|--------|
| id | PK | |
| user_id | FK → users | |
| dob | date | API: `date_of_birth` |
| gender | string | |
| blood_group | string | |
| address | string | |
| emergency_contact | string | |

### appointments
| Column | Type | Notes |
|--------|------|--------|
| id | PK | |
| patient_id | FK → patients | |
| doctor_id | FK → doctors | |
| appointment_date | date | Synced from `scheduled_at` |
| appointment_time | time | Synced from `scheduled_at` |
| scheduled_at | datetime | Canonical UTC timestamp |
| status | enum | pending, confirmed/approved, completed, cancelled, no_show, … |
| notes | text | |
| payment_status | enum | unpaid, pending, paid, refunded, failed |

### prescriptions
| Column | Type | Notes |
|--------|------|--------|
| id | PK | |
| appointment_id | FK → appointments | |
| doctor_id | FK → doctors | |
| patient_id | FK → patients | |
| medicine | string | Primary medicine line |
| dosage | string | Primary dosage |
| instructions | text | |
| medicines | JSON | Multi-drug lines (extension) |

### payments
| Column | Type | Notes |
|--------|------|--------|
| id | PK | |
| appointment_id | FK → appointments | |
| amount | float | |
| payment_mode | string | mock / stripe / razorpay (API: `gateway`) |
| status | enum | pending, success, failed, refunded |
| transaction_id | string | API: `gateway_ref` |

## Mapping (design ↔ code)

| Design | DB column | Python / API |
|--------|-----------|--------------|
| Users.name | `name` | `full_name` |
| Users.password | `password` | `hashed_password` |
| Doctors.specialization | `specialization` | `specialty` |
| Doctors.experience | `experience` | `experience_years` |
| Doctors.rating | `rating` | `rating_avg` |
| Patients.dob | `dob` | `date_of_birth` |
| Payments.payment_mode | `payment_mode` | `gateway` / `payment_mode` |
| Payments.transaction_id | `transaction_id` | `gateway_ref` / `transaction_id` |

## Indexes & constraints

- Unique: `users.email`, `doctors.user_id`, `patients.user_id`, `payments.invoice_number`
- Indexes: appointment doctor/patient + `scheduled_at`, `appointment_date`, payment status
- FK cascades: user → doctor/patient profiles on delete

## Migrations

- Local SQLite: `Base.metadata.create_all` on startup
- Postgres: Alembic (`backend/alembic/versions/`)
