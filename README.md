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
- `apps/professional-web`: professional portal scaffold
- `apps/admin-web`: admin portal scaffold
- `packages/types`: shared contracts
- `packages/ui`: shared UI primitives

## Patient Demo (stakeholder)
The patient side includes:
- Register/login
- Mandatory 10-question intake
- Safety risk screening (blocks booking if risk is detected)
- Professional matching with compatibility score
- Internal 1:1 chat
- Slot booking with timezone rendering
- Stripe package checkout simulation
- Post-booking confirmation + session history
- Profile sections: my data, cards, subscription, settings, support, logout
- Architecture page for shareholders (front, backend, data, APIs)
- Premium visual UI with custom illustrations

Run only patient app:
1. `npm install`
2. `npm run dev -w @therapy/patient-web`
3. Open [http://localhost:5173](http://localhost:5173)

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
   - `npm run prisma:migrate -w @therapy/api`
5. Run all apps:
   - `npm run dev`

## Current policy defaults
- Free cancellation until 24h before session.
- <24h cancellation penalty: configurable.
- No-show: consumes one package credit.
