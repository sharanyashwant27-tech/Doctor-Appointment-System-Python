# MediBook Security

## Controls

| Control | Status | Notes |
|---------|--------|-------|
| JWT Authentication | Yes | Access + refresh (`jti`, hashed refresh in DB), HS256 |
| Password Hashing (bcrypt) | Yes | `passlib` + `bcrypt` in `auth/security.py` |
| CSRF Protection | Yes | Origin/Referer allowlist + optional double-submit cookie (`GET /api/v1/security/csrf`) |
| Rate Limiting | Yes | `middleware/rate_limit.py` — auth routes use `RATE_LIMIT_AUTH` (default 10/min); general `RATE_LIMIT_DEFAULT` |
| RBAC | Yes | `require_roles()` + frontend `RoleGuard` |
| Input Validation | Yes | Pydantic schemas + Zod on forms |
| SQL Injection Protection | Yes | SQLAlchemy ORM / bound parameters |
| Audit Logging | Yes | `audit_service.write_audit` + admin export |
| HTTPS Support | Yes | `frontend/nginx-ssl.conf` + `docker-compose.https.yml` |

## Configuration (`.env`)

```
CSRF_ENABLED=true
CSRF_TRUSTED_HOSTS=localhost:8905,127.0.0.1:8905
RATE_LIMIT_ENABLED=true
RATE_LIMIT_DEFAULT=120/minute
RATE_LIMIT_AUTH=10/minute
HTTPS_ENABLED=false
SECRET_KEY=<long-random-secret>
CORS_ORIGINS=http://localhost:8905
```

Tests disable CSRF and rate limits via `conftest.py`.

## HTTPS (local)

```powershell
powershell -File scripts/generate-dev-certs.ps1
docker compose -f docker-compose.yml -f docker-compose.https.yml up --build
```

App: `https://localhost:8905` (trust the self-signed cert in the browser).

## CSRF usage (SPA)

1. Call `GET /api/v1/security/csrf` once per session.
2. Send `X-CSRF-Token` on mutating requests when the `medibook_csrf` cookie is set.
3. Browser `Origin` must match `CORS_ORIGINS` / `CSRF_TRUSTED_HOSTS`.

Bearer JWT in `Authorization` is not auto-sent cross-site, so classic CSRF risk is low; Origin + optional double-submit still harden the API.
