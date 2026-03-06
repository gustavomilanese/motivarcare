# Therapy Platform

Modular monorepo for an online therapy platform (USA): patient, professional, and admin sides.

## Stack
- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express + TypeScript
- DB: PostgreSQL + Prisma
- Queue/cache: Redis
- Payments: Stripe
- Video: Daily

## Structure
- `apps/api`: modular API
- `apps/patient-web`: patient portal (demo-ready)
- `apps/professional-web`: professional portal (functional MVP)
- `apps/admin-web`: admin portal (auth + user management)
- `packages/types`: shared contracts
- `packages/ui`: shared UI primitives

## Current MVP Capabilities
- API with real auth (`register`, `login`, `me`) and signed bearer token.
- Prisma-backed modules for profiles, availability, bookings, professional dashboard, earnings, admin data, and chat.
- Bidirectional patient-professional chat persisted in PostgreSQL.
- Patient portal integrated with backend auth + backend chat.
- Professional portal integrated with backend:
  - Dashboard principal (KPIs + próximas sesiones)
  - Horarios (alta y baja de slots)
  - Pacientes (listado con estado)
  - Mensajería 1 a 1
  - Perfil público editable
  - Ingresos (resumen + movimientos)
  - Solapa administrativa
- Admin portal integrated with backend:
  - Role gateway (patient/professional/admin selector)
  - Admin auth against API
  - Dashboard KPI
  - User management module (list, create, edit, password reset)
  - Role-aware profile fields (patient status/timezone, professional visibility/cancellation policy)

## Patient Side (demo)
- Register/login against API
- Mandatory 10-question intake
- Safety risk screening (blocks booking if risk is detected)
- Professional matching with compatibility score
- Internal 1:1 chat (real backend)
- Slot booking with timezone rendering
- Stripe package checkout simulation
- Post-booking confirmation + session history
- Profile sections: my data, cards, subscription, settings, support, logout
- Premium visual UI with custom illustrations

Run only patient app:
1. `npm install`
2. `npm run dev -w @therapy/patient-web`
3. Open [http://localhost:5173](http://localhost:5173)

Run only professional app:
1. `npm install`
2. `npm run dev -w @therapy/professional-web`
3. Open [http://localhost:5174](http://localhost:5174)

Run only admin app:
1. `npm install`
2. `npm run dev -w @therapy/admin-web`
3. Open [http://localhost:5175](http://localhost:5175)

## Product readiness
- Today: high-quality demo and functional pre-MVP workflow.
- Not yet production-ready: auth hardening, real Stripe webhooks, compliance controls, monitoring, and security audits are pending.
- Yes, it can evolve directly into production with phased implementation on top of this architecture.

## Full Local Setup
1. Copy `.env.example` to `.env` and fill credentials.
2. Start local infra:
   - `npm run db:up`
3. Install dependencies:
   - `npm install`
4. Prisma:
   - `npm run prisma:generate -w @therapy/api`
   - `npm run prisma:push -w @therapy/api`
   - `npm run db:seed`
5. Run all apps:
   - `npm run dev`

## Demo Credentials
- Patient: `alex@example.com` / `SecurePass123`
- Professional (Emma): `emma.collins@motivarte.com` / `SecurePass123`
- Professional (Michael): `michael.rivera@motivarte.com` / `SecurePass123`
- Professional (Sophia): `sophia.nguyen@motivarte.com` / `SecurePass123`
- Admin: `admin@motivarte.com` / `SecurePass123`

## Current policy defaults
- Free cancellation until 24h before session.
- <24h cancellation penalty: configurable.
- No-show: consumes one package credit.
