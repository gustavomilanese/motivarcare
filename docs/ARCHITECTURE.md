# MotivarCare — arquitectura

Última actualización: **2026-09-09**. Basado en el árbol del monorepo, `package.json`, `apps/api/src/app.ts`, Prisma y `infra/deploy`.

## Vista general

```
Clientes (web Vercel / Expo)
        │  HTTPS + Bearer
        ▼
API Express (Railway)  ─── MySQL (Prisma)
        │              ─── Redis (rate limit, locks, colas)
        ├── dLocal Go / Stripe (pagos)
        ├── Resend, Google, Daily, OpenAI
        └── Worker outbox (mismo repo; proceso separado recomendado)
```

Los fronts no hablan directo a la DB. La API monta rutas bajo `/api` y `/api/v1`.

## Monorepo

Workspaces npm: `apps/*`, `packages/*`. Motor: Node ≥ 20.

### Apps (`apps/`)

| App | Package | Rol |
| --- | --- | --- |
| `api` | `@therapy/api` | Backend HTTP + scripts `start` / `start:outbox` / `start:notification` |
| `patient` | `@therapy/patient` | Portal paciente (React + Vite) |
| `professional` | `@therapy/professional` | Portal profesional |
| `admin` | `@therapy/admin` | Panel admin |
| `patient-landing` | `@therapy/patient-landing` | Landing paciente (actual) |
| `patient-landing-v2` | `@therapy/patient-landing-v2` | Landing alternativa |
| `landing` | `@therapy/landing` | Landing marketing adicional |
| `patient-mobile` | `@therapy/patient-mobile` | Expo paciente |
| `professional-mobile` | `@therapy/professional-mobile` | Expo profesional |

Puertos desa típicos (`tecnologias-desa-prod.md`): API `4000`, patient `5173`, professional `5174`, admin `5175`.

Comunicación front → API:

- Web: `resolveWebAppApiBase` / client en `@therapy/auth`; en Vite, proxy `/api` → `:4000`; prod `VITE_API_URL` / `API_PUBLIC_URL`.
- Expo: `EXPO_PUBLIC_API_URL` o default prod `https://api.motivarcare.com`.

### Packages (`packages/`)

| Package | Nombre npm | Rol |
| --- | --- | --- |
| `types` | `@therapy/types` | Contratos compartidos (cobertura dLocal, monedas display, mercados, etc.) |
| `utils` | `@therapy/i18n-config` | Locale, FX display, `ceilUsdToLocalMajor`, helpers de reserva |
| `auth` | `@therapy/auth` | Cliente HTTP web compartido (no emite JWT) |
| `ui` | `@therapy/ui` | Primitivas UI MotivarCare |
| `patient-core` | `@therapy/patient-core` | Dominio paciente compartido (catálogo paquetes, bookings helpers, notificaciones) |
| `database` | `@therapy/database` | Scaffold vacío (`export {}`) |

## API

- Entrada: `apps/api/src/app.ts`
- Auth: `apps/api/src/lib/auth.ts` — password PBKDF2, token bearer firmado, roles, expiración ~7 días; `JWT_SECRET` en env.
- Config: `apps/api/src/config/env.ts` + `.env.example` en raíz.

### Módulos (`apps/api/src/modules/`)

| Módulo | Dominio |
| --- | --- |
| `auth` | Login/registro, verificación email, OAuth Calendar, `/me` |
| `profiles` | Perfiles + **matching** |
| `availability` | Slots |
| `bookings` | Reservas, créditos, trial |
| `payments` | Stripe + **dLocal Go** checkout / webhooks |
| `payouts` | Liquidaciones a profesionales |
| `finance` | Ledger financiero / admin finance |
| `chat` | Chat 1:1 paciente–profesional |
| `professional` | Dashboard / ops profesional |
| `admin` | Rutas admin |
| `public` | Endpoints públicos (p. ej. FX display) |
| `video` | Sesiones Daily |
| `ai-audit` | Jobs de auditoría IA |
| `intake-chat` | Intake conversacional (flag) |
| `treatment-chat` | Chat de tratamiento / Maca |
| `emotional-diary` | Diario emocional |
| `onboarding-drafts` | Borradores de onboarding |
| `landing-chat` | Chat en landings |
| `notifications` | Notificaciones |
| `web-content` | Contenido web |
| `health` | Healthchecks |

### Datos (Prisma / MySQL)

Schema: `apps/api/prisma/schema.prisma`. Modelos centrales (no exhaustivo):

- Identidad: `User`, `VerificationToken`, `OnboardingDraft`, perfiles por rol
- Clínico / onboarding: `PatientIntake`, chats de intake/treatment, `EmotionalDiary*`
- Comercial: `SessionPackage`, `PatientPackagePurchase` (`remainingCredits`), `CreditLedger`, `PaymentCheckout*`
- Operación: `AvailabilitySlot`, `Booking`, `ChatThread` / `ChatMessage`, `VideoSession`
- Finanzas: `FinanceSessionRecord`, `FinancePayoutRun` / `FinancePayoutLine`, agregados
- Infra: `OutboxEvent`, `SystemConfig`, `Consent`, `AIAuditJob`, auditoría de seguridad

Redis: rate limiting, locks de reserva (`API_BOOKING_LOCK_TTL_MS`), idempotencia / colas según configuración.

## Front paciente (organización CSS)

El portal paciente partió el CSS monolítico por **dominio/pantalla** (no por componente React), con techo ~1.5k líneas. Estado: `docs/css-limpieza-estado.md`. Imports en `apps/patient/src/styles/index.css`. Guardrails: `npm run css:snapshot` / `css:check`.

## Deploy

| Qué | Dónde |
| --- | --- |
| API + worker outbox | **Railway** (`railway.toml`, `nixpacks.toml`) |
| MySQL + Redis prod | Plugins Railway |
| Portales / landings | **Vercel** (`apps/*/vercel.json`) |
| Nativas | EAS / Expo cuando haya builds de store |

Guía: `infra/deploy/DEPLOY.md`.  
Release API: build `build:api`; start `npm run start -w @therapy/api`; health live; `prisma db push` en release según config.

Un cambio local **no** llega a prod hasta commit + push.

## Diagrama de dependencias (simplificado)

```
apps/patient ──┐
apps/professional ─┼── @therapy/auth, types, ui, i18n-config
apps/admin ────┘         │
apps/patient-mobile ──── @therapy/patient-core, types
                         │
apps/api ─────────────── @therapy/types, i18n-config
                         │
                    MySQL / Redis / proveedores externos
```

## Fuentes

- `package.json` (raíz)
- `apps/api/src/app.ts`, `apps/api/prisma/schema.prisma`
- `docs/tecnologias-desa-prod.md`
- `infra/deploy/DEPLOY.md`
- `.cursor/rules/deploy-git-push.mdc`
