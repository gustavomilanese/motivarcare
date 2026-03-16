# Estado actual de arquitectura (corte: 2026-03-16)

## 1) Resumen ejecutivo
Hoy la plataforma ya tiene una base sólida para escalar en etapas:

- Monorepo modular con 5 apps (`api`, `patient`, `professional`, `admin`, `landing`) y paquetes compartidos.
- Backend único (Node + Express + Prisma + MySQL + Redis) con módulos por dominio.
- Seguridad y operación base implementadas (auth JWT, rate limit, healthchecks, métricas, control de concurrencia, graceful shutdown).
- Pipeline financiero con modelo de comisiones configurable y outbox asíncrono para eventos de Stripe.

Conclusión rápida: la arquitectura actual es válida para crecer, pero todavía requiere terminar algunos frentes para nivel "productivo fuerte" (principalmente checkout Stripe end-to-end en frontend, observabilidad completa y reducción de algunos archivos grandes).

---

## 2) Mapa actual de arquitectura

### 2.1 Estructura general

```text
apps/
  api            -> Backend principal (módulos Express)
  patient        -> Portal paciente
  professional   -> Portal profesional
  admin          -> Portal admin
  landing        -> Sitio público/marketing

packages/
  auth           -> cliente API compartido + timezone sync helpers
  database       -> contratos/base package (scaffold)
  types          -> tipos compartidos
  ui             -> componentes UI compartidos
  utils          -> i18n/currency shared config
```

### 2.2 Separación por capas (adoptada en portales)
En `admin`, `patient` y `professional` se está usando el patrón:

- `pages/` pantallas
- `components/` UI reusable
- `hooks/` estado/efectos por dominio
- `services/` llamadas API
- `types/` contratos

Además, `App.tsx` quedó liviano en los tres portales (reexporta `AppRoot`).

### 2.3 Backend modular
La API monta routers por dominio bajo `/api` y `/api/v1`:

- `auth`, `profiles`, `availability`, `bookings`, `payments`, `video`, `chat`, `professional`, `admin`, `public`, `finance`, `health`, `ai-audit`.

Esto permite escalar por módulos sin romper toda la app.

---

## 3) Datos y persistencia

### 3.1 Modelo base (Prisma + MySQL)
Entidades principales implementadas:

- Usuarios y roles: `User` (`PATIENT`, `PROFESSIONAL`, `ADMIN`)
- Verificación de email: `emailVerified` + `VerificationToken`
- Perfiles: `PatientProfile`, `ProfessionalProfile`, `ProfessionalDiploma`
- Operación clínica: `AvailabilitySlot`, `Booking`, `ChatThread`, `ChatMessage`, `VideoSession`, `PatientIntake`
- Pagos/finanzas: `SessionPackage`, `PatientPackagePurchase`, `CreditLedger`, `FinanceSessionRecord`, `FinancePayoutRun`, `FinancePayoutLine`, `FinanceDailyAggregate`
- Integración asíncrona: `OutboxEvent`

### 3.2 Timezone model (ya aplicado)
- Detección automática en cliente con `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- Guardado de `lastSeenTimezone` en paciente/profesional.
- En reserva se persiste snapshot histórico:
  - `patientTimezoneAtBooking`
  - `professionalTimezoneAtBooking`
- Backend opera con timestamps UTC y conserva trazabilidad de cómo se agendó.

---

## 4) Seguridad, confiabilidad y operación

### 4.1 Seguridad y control de acceso
- Auth por Bearer JWT en endpoints protegidos.
- CORS por allowlist.
- Headers de seguridad (CSP restrictiva, frame deny, etc.).
- Verificación de email para paciente/profesional con token de 24h, resend y bypass DEV controlado.
- Chat con restricciones de alcance (paciente solo con profesionales asignados o con relación válida).

### 4.2 Concurrencia y resiliencia
- Rate limiting por IP/email para login y tráfico general.
- Límite de requests en vuelo para proteger saturación.
- Locks distribuidos en reservas para evitar doble booking.
- Idempotencia en creación de booking y checkout Stripe.
- Graceful shutdown + readiness/liveness endpoints.

### 4.3 Procesamiento asíncrono
- Webhook Stripe encola eventos en `OutboxEvent` (dedupe por `stripe:event:<id>`).
- Worker outbox con:
  - reintentos exponenciales
  - recuperación de jobs "stuck"
  - dead-letter al exceder intentos

---

## 5) Finanzas: estado de arquitectura

Implementado:

- Reglas financieras configurables en DB (`platformCommissionPercent`, `trialPlatformPercent`, `defaultSessionPriceCents`).
- Cálculo de ledger por sesión completada (`FinanceSessionRecord`).
- Dashboard admin de finanzas modularizado (`apps/admin/src/modules/finance/*`).
- Corridas de liquidación (`FinancePayoutRun`) y líneas por profesional (`FinancePayoutLine`).
- Seguimiento de operaciones Stripe/outbox + reintentos desde admin.

Resultado: ya existe la base para medir ingresos por profesional, paciente, paquete y total plataforma.

---

## 6) Estado de escalabilidad (realista)

### Lo que ya está bien encaminado
- API stateless (replicable horizontalmente).
- MySQL/Redis desacoplados del runtime frontend.
- Dominios separados por módulos.
- Base de idempotencia, locking y outbox en producción de pagos.

### Lo que todavía falta para "escala enterprise"
- Dashboards/alertas productivas sobre métricas (`/metrics` existe, falta stack de observabilidad completa).
- Tests automáticos más amplios (hoy hay tests puntuales, no cobertura integral de journeys).
- Endurecer módulos grandes remanentes.
- Cierre de integración frontend checkout Stripe real (hoy backend listo, UX todavía parcial/simulada en flujo onboarding final de paciente).

---

## 7) Deuda técnica visible (prioridad de refactor)

Hotspots actuales por tamaño (líneas aprox):

- `apps/landing/src/App.tsx`: 3321
- `apps/api/src/modules/admin/admin.routes.ts`: 1661
- `apps/api/src/modules/bookings/bookings.routes.ts`: 848
- `apps/patient/src/modules/app/pages/MainPortal.tsx`: 829
- `apps/api/src/modules/finance/finance.service.ts`: 784

Riesgo: cuanto más crecen estos archivos, más lento y riesgoso se vuelve cambiar funcionalidades críticas.

Mitigación recomendada: seguir el mismo patrón modular aplicado en finanzas (extraer submódulos, hooks, servicios y tests por dominio).

---

## 8) Propuesta de siguiente etapa de arquitectura

### Etapa A (corto plazo)
- Completar integración Stripe frontend end-to-end.
- Segmentar `admin.routes.ts` por subrouters (`patients`, `professionals`, `packages`, `web-content`).
- Segmentar `MainPortal.tsx` paciente por dominios (`navigation`, `booking orchestration`, `chat orchestration`).

### Etapa B
- Mover `landing/App.tsx` a módulos por secciones.
- Incorporar suite de tests por journeys críticos (registro, onboarding, reserva, pago, cierre de sesión).
- Crear panel operativo de alertas mínimas (errores 5xx, webhook fallidos, outbox dead-letter).

### Etapa C
- Preparar contratos API versionados para apps nativas (iOS/Android) con documentación de integración por dominio.

---

## 9) Mensaje para socios
La plataforma no está "en cero": tiene una arquitectura moderna, modular y con fundamentos correctos para escalar. Ya soporta los flujos core y la base financiera/operativa. El siguiente salto no es rehacer todo, sino cerrar los frentes pendientes y seguir modularizando los puntos grandes para sostener crecimiento con menor riesgo.
