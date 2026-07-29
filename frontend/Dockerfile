# MediBook frontend — build from repo root:
#   docker build -f frontend/Dockerfile -t medibook-frontend .
FROM node:20-alpine AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ .
COPY README.md /app/README.md
RUN npm run build

FROM nginx:1.27-alpine
LABEL org.opencontainers.image.title="MediBook Frontend" \
      org.opencontainers.image.description="Doctor Appointment System UI (React + Nginx)" \
      org.opencontainers.image.source="https://github.com/sharanyashwant27-tech/Doctor-Appointment-System-Python" \
      org.opencontainers.image.documentation="https://github.com/sharanyashwant27-tech/Doctor-Appointment-System-Python/blob/main/README.md"

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
COPY README.md /usr/share/nginx/html/README.md
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
