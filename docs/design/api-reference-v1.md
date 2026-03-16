# API Reference v1

Base URL:
- Legacy: `/api/*`
- Versionada: `/api/v1/*` (recomendada para mobile)

## Headers
- `Authorization: Bearer <token>`
- `X-Request-Id` (opcional, recomendado)
- `X-Client-Version` (recomendado en mobile)
- `X-Idempotency-Key` (obligatorio en POST críticos)

## Módulos principales

### Auth
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `PATCH /api/v1/auth/me`
- `POST /api/v1/auth/change-password`

### Profiles
- `GET /api/v1/profiles/professionals`
- `GET /api/v1/profiles/me`
- `POST /api/v1/profiles/me/intake`
- `PATCH /api/v1/profiles/professional/:professionalId/public-profile`

### Booking/Availability
- `GET /api/v1/availability/me/slots`
- `GET /api/v1/availability/:professionalId/slots`
- `POST /api/v1/availability/slots`
- `DELETE /api/v1/availability/slots/:slotId`
- `GET /api/v1/bookings/mine`
- `POST /api/v1/bookings`
- `POST /api/v1/bookings/:bookingId/reschedule`
- `POST /api/v1/bookings/:bookingId/cancel`

### Payments
- `POST /api/v1/payments/stripe/checkout-session`
- `POST /api/v1/payments/stripe/webhook`

### Finance (Admin)
- `GET /api/v1/admin/finance/settings`
- `PATCH /api/v1/admin/finance/settings`
- `POST /api/v1/admin/finance/rebuild-session-records`
- `GET /api/v1/admin/finance/overview`
- `GET /api/v1/admin/finance/payouts/runs`
- `POST /api/v1/admin/finance/payouts/runs`
- `GET /api/v1/admin/finance/payouts/runs/:runId`
- `POST /api/v1/admin/finance/payouts/lines/:lineId/mark-paid`
- `POST /api/v1/admin/finance/payouts/runs/:runId/close`

## Contratos recomendados para mobile
1. Todos los listados con `cursor` o `page/pageSize`.
2. Errores normalizados (`code`, `message`, `requestId`, `details`).
3. Compatibilidad semántica: nunca romper campos existentes en `v1`.
4. Timezones siempre en ISO UTC + timezone del usuario.
