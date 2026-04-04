# Therapy Platform

Modular monorepo for an online therapy platform (USA): patient, professional, and admin sides.

## Stack
- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express + TypeScript
- DB: MySQL + Prisma
- Queue/cache: Redis
- Payments: Stripe
- Video: Daily

## Structure
- `apps/api`: modular API
- `apps/landing`: marketing landing
- `apps/patient`: patient portal (demo-ready)
- `apps/professional`: professional portal (functional MVP)
- `apps/admin`: admin portal scaffold
- `packages/database`: database contracts and integrations (scaffold)
- `packages/auth`: auth domain and shared flows (scaffold)
- `packages/types`: shared contracts
- `packages/ui`: shared UI primitives
- `packages/utils`: shared locale + currency config and helpers
- `infra/docker`: local container stack
- `infra/deploy`: deployment assets
- `docs`: architecture and product docs

## Current MVP Capabilities
- API with real auth (`register`, `login`, `me`) and signed bearer token.
- Prisma-backed modules for profiles, availability, bookings, professional dashboard, earnings, admin data, and chat.
- Bidirectional patient-professional chat persisted in MySQL.
- Multilanguage UI baseline in patient/professional/admin (`es`, `en`, `pt`).
- Multicurrency display baseline in patient/professional/admin:
  - Default: `USD`
  - Supported: `USD`, `EUR`, `GBP`, `BRL`, `ARS`
- Admin portal with authenticated user module:
  - Alta de pacientes
  - Alta de profesionales
  - Alta de admins
  - Edicion de perfiles por rol (incluye video de presentacion profesional)
- Patient portal integrated with backend auth + backend chat.
- Professional portal integrated with backend:
  - Dashboard principal (KPIs + próximas sesiones)
  - Horarios (alta y baja de slots)
  - Pacientes (listado con estado)
  - Mensajería 1 a 1
  - Perfil público editable
  - Ingresos (resumen + movimientos)
  - Solapa administrativa

## Patient Side (demo)
- Register/login against API
- Mandatory 10-question intake
- Safety risk screening (blocks booking if risk is detected)
- Professional matching fully server-side (`patient vs professional`) with compatibility score
- Internal 1:1 chat (real backend)
- Slot booking with timezone rendering
- Stripe package checkout simulation
- Post-booking confirmation + session history
- Profile sections: my data, cards, subscription, settings, support, logout
- Premium visual UI with custom illustrations

## Matching Architecture (server-side)
- Endpoint used by patient portal:
  - `GET /api/profiles/me/matching?language=es|en|pt`
- Public directory endpoint (no patient scoring):
  - `GET /api/profiles/professionals`
- Matching score is computed in backend and returned to frontend:
  - `matchScore`
  - `matchReasons`
  - `matchedTopics`
  - `suggestedSlots`
- Main scoring factors:
  - Clinical topics extracted from patient intake answers
  - Professional profile keywords (bio, specialization, focus, therapeutic approach)
  - Preferred therapeutic approach
  - Preferred language
  - Availability window preference
  - Professional experience
  - Base compatibility + rating adjustment
- Frontend now only filters/sorts the server-ranked data (no duplicated local scoring logic).

## Admin-configurable professional card data
Admin can configure the matching card data shown to patients per professional:
- `birthCountry` (flag in card)
- `sessionPriceUsd` (price in card)
- `ratingAverage` and `reviewsCount` (stars/opinions)
- `sessionDurationMinutes`
- `activePatientsCount`
- `sessionsCount`
- `completedSessionsCount`

These overrides are stored in `system_config` under:
- `professional-display-overrides`

## Componentization Notes
Current patient matching UI is split into reusable pieces:
- `MatchingHeader` (filters/sort/favorites actions)
- `ProfessionalMatchCard` (professional card + favorite toggle + slots)
- `PatientMatchingPage` (screen orchestration and booking flow)
- `PortalNavigation` (toolbar including favorites access)

Professional schedule settings are also modular:
- `SchedulePage` > `Ajustes` > `Valor de sesión` (source for patient card pricing)

## Patient Portal Refactor (2026-03)
Main objective: reduce coupling and oversized page files while preserving behavior.

Before:
- `MainPortal` and `BookingPage` concentrated routing, business rules, UI state, and large JSX blocks.
- Patient runtime mixed real API flows with static catalog usage in core screens.

After:
- Runtime data path standardized around backend directory/matching APIs, with controlled fallback.
- `MainPortal` now orchestrates and delegates to focused hooks/components.
- `BookingPage` moved large modal/panel sections into dedicated UI components.

New extracted modules:
- `apps/patient/src/modules/app/pages/PortalRoutes.tsx` (route tree for portal pages)
- `apps/patient/src/modules/app/hooks/usePortalActions.ts` (booking/package/chat/favorites operations)
- `apps/patient/src/modules/app/hooks/usePortalNotifications.ts` (notifications polling + mapping)
- `apps/patient/src/modules/app/hooks/usePortalUiState.ts` (menu/notifications/preferences state)
- `apps/patient/src/modules/app/hooks/usePortalNavigation.ts` (cross-page navigation handlers)
- `apps/patient/src/modules/app/lib/professionals.ts` (professional/slot lookup utilities)
- `apps/patient/src/modules/app/lib/packageCatalog.ts` (package copy + catalog loading helpers)
- `apps/patient/src/modules/app/components/booking/BookingActionModal.tsx`
- `apps/patient/src/modules/app/components/booking/CheckoutPackagesPanel.tsx`

Verification status:
- `npm run build -w @therapy/patient` passing
- `npm run test -w @therapy/patient` passing

Run only patient app:
1. `npm install`
2. `npm run dev -w @therapy/patient`
3. Open [http://localhost:5173](http://localhost:5173)

Run only professional app:
1. `npm install`
2. `npm run dev -w @therapy/professional`
3. Open [http://localhost:5174](http://localhost:5174)

## Product readiness
- Today: high-quality demo and functional pre-MVP workflow.
- Not yet production-ready: compliance controls, full observability stack (dashboards + alerts + traces), and external security audits are pending.
- Added security baseline in API:
  - CORS allowlist via `CORS_ORIGINS`
  - `Authorization` bearer-only access on protected modules
  - Security response headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`)
- Yes, it can evolve directly into production with phased implementation on top of this architecture.

## Scalability / Concurrency / HA status
- Concurrency: yes (Node.js handles concurrent I/O requests).
- Horizontal scalability: ready at application level because API is stateless and can run multiple replicas behind a load balancer.
- High availability: not automatic yet in local setup; requires multi-instance deployment + managed MySQL/Redis + health-check based routing.
- New API production baseline added:
  - `GET /health/live` (liveness)
  - `GET /health/ready` (readiness: DB + draining state)
  - Graceful shutdown on `SIGINT/SIGTERM` with request draining
  - Per-IP rate limiting and in-flight request protection

## Full Local Setup
1. Copy `.env.example` to `.env` and fill credentials.
2. Start local infra:
   - `npm run db:up`
3. Install dependencies:
   - `npm install`
4. Prisma:
   - `npm run prisma:generate -w @therapy/api`
   - `DATABASE_URL='mysql://root:root@127.0.0.1:3307/therapy_platform' npm run prisma:push -w @therapy/api`
   - `DATABASE_URL='mysql://root:root@127.0.0.1:3307/therapy_platform' npm run prisma:seed -w @therapy/api`
5. Run all apps:
   - `npm run dev`
6. Run outbox worker (required for async events like Stripe webhook processing):
   - `npm run dev:outbox -w @therapy/api`

## Stripe multi-currency configuration
- Legacy USD-only env vars still work:
  - `STRIPE_PRICE_PACKAGE_4`
  - `STRIPE_PRICE_PACKAGE_8`
  - `STRIPE_PRICE_PACKAGE_12`
- Recommended for multi-currency checkout:
  - `STRIPE_PRICE_MAP_JSON`
  - Example:
    - `{"USD":{"4":"price_usd_4","8":"price_usd_8","12":"price_usd_12"},"EUR":{"4":"price_eur_4","8":"price_eur_8","12":"price_eur_12"}}`

## Demo Credentials
- Patient: `alex@example.com` / `SecurePass123`
- Professional (Emma): `emma.collins@motivarte.com` / `SecurePass123`
- Professional (Michael): `michael.rivera@motivarte.com` / `SecurePass123`
- Professional (Sophia): `sophia.nguyen@motivarte.com` / `SecurePass123`

## Current policy defaults
- Free cancellation until 24h before session.
- <24h cancellation penalty: configurable.
- No-show: consumes one available session from the package.
- Patient reschedule: allowed only until 24h before the original session start.
- Professional reschedule: allowed at any time (including after session start/end), except cancelled bookings.

## Google Meet (automatic invites)
- If Google Calendar credentials are configured, each booking creates a Google Meet link and sends invitations to patient + professional.
- If credentials are missing or Google fails, API falls back to existing Daily links.
- Required env vars (API):
  - `API_PUBLIC_URL` (for OAuth callback URL construction, for example `http://localhost:4000`)
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_REFRESH_TOKEN`
  - `GOOGLE_CALENDAR_ID` (for example `primary`)

## Google Calendar user sync (professional/patient)
- Users can connect/disconnect their own Google account from the app settings/profile.
- OAuth endpoints:
  - `POST /api/auth/google/calendar/connect`
  - `GET /api/auth/google/calendar/callback`
  - `GET /api/auth/google/calendar/status`
  - `POST /api/auth/google/calendar/disconnect`
- Booking sync behavior:
  - Order of attempts: professional connected calendar, then patient calendar, then platform calendar (`GOOGLE_REFRESH_TOKEN` + `GOOGLE_CALENDAR_ID`). If a step fails (expired token, API error), the next option is tried; only if all fail do Daily.co URLs stay on the booking.
  - On reschedule/cancel, the same calendar event is updated/cancelled and Google sends attendee updates.

## Architecture and deploy
- **Architecture:** `docs/presentacion-arquitectura-motivcare.md` (API, datos, outbox, operación).
- **Deploy (Railway + Hostinger):** `infra/deploy/DEPLOY.md` — paso a paso. En la raíz del repo: `railway.toml` y `nixpacks.toml` para la API.
