# Enterprise Runbook (API)

## Objetivo
Dejar la plataforma lista para operar con mayor volumen sin perder consistencia en reservas, cobros y auditoría.

## Controles implementados
- Rate limit global y de login (`API_RATE_LIMIT_*`, `API_AUTH_LOGIN_*`).
- Límite de requests concurrentes (`API_MAX_INFLIGHT_REQUESTS`).
- Idempotencia en escrituras críticas:
  - crear reserva
  - crear checkout de Stripe
- Lock distribuido por slot de reserva (Redis) para evitar doble booking.
- Endpoint `/metrics` (Prometheus) para latencia, throughput e in-flight.
- Access logs JSON con `x-request-id`.
- Cola outbox con reintentos exponenciales y dead-letter (`DEAD_LETTER`).
- Webhook Stripe firmado + procesamiento async por outbox.
- Health endpoints:
  - `GET /health/live`
  - `GET /health/ready` (DB y Redis cuando aplica)

## Variables clave
Revisar `.env.example`:
- `API_RATE_LIMIT_BACKEND`, `API_RATE_LIMIT_WINDOW_MS`, `API_RATE_LIMIT_MAX_REQUESTS`
- `API_AUTH_LOGIN_WINDOW_MS`, `API_AUTH_LOGIN_MAX_ATTEMPTS`
- `API_MAX_INFLIGHT_REQUESTS`
- `API_REQUEST_TIMEOUT_MS`, `API_MAX_REQUESTS_PER_SOCKET`
- `API_METRICS_ENABLED`, `API_ACCESS_LOG_ENABLED`
- `API_BOOKING_LOCK_TTL_MS`
- `OUTBOX_POLL_MS`, `OUTBOX_BATCH_SIZE`, `OUTBOX_MAX_ATTEMPTS`, `OUTBOX_RETRY_BASE_MS`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

## Procesos
- API: `npm run dev -w @therapy/api`
- Outbox worker: `npm run dev:outbox -w @therapy/api`

En producción correr API y worker como procesos separados.

## Dashboards mínimos recomendados
- p95/p99 latencia (`api_http_request_duration_ms`)
- requests por ruta (`api_http_requests_total`)
- in-flight (`api_inflight_requests`)
- status de outbox:
  - `PENDING` creciendo = atraso
  - `DEAD_LETTER` > 0 = incidente

## Alarmas mínimas
- `DEAD_LETTER > 0`
- error rate > 2% por 5 min
- p99 > 1500 ms por 10 min
- `/health/ready` en 503

## Backlog enterprise siguiente
- OpenTelemetry (trazas distribuidas).
- Rotación de secretos y gestión centralizada (Vault/Secrets Manager).
- Replica de lectura + estrategia multi-región.
- WAF/edge rate limiting (Cloudflare/API Gateway).
