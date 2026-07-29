# MediBook API — build from repo root:
#   docker build -f backend/Dockerfile -t medibook-backend .
FROM python:3.13-slim

LABEL org.opencontainers.image.title="MediBook Backend" \
      org.opencontainers.image.description="Doctor Appointment System API (FastAPI)" \
      org.opencontainers.image.source="https://github.com/sharanyashwant27-tech/Doctor-Appointment-System-Python" \
      org.opencontainers.image.documentation="https://github.com/sharanyashwant27-tech/Doctor-Appointment-System-Python/blob/main/README.md" \
      org.opencontainers.image.licenses="Proprietary"

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .
COPY README.md /app/README.md
COPY docs /app/docs

RUN chmod +x /app/docker-entrypoint.sh

ENV PYTHONPATH=/app \
    APP_NAME=MediBook \
    ENVIRONMENT=production

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8000/health || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
