# MotivarCare — reglas de negocio (desde el código)

Última actualización: **2026-09-09**.  
Solo reglas respaldadas por implementación o docs de producto alineados al código. Si una regla de negocio “deseada” no está en código, no figura acá (ver `open-questions.md` / [PENDING_TASKS.md](./PENDING_TASKS.md)).

## Roles

| Rol | Uso |
| --- | --- |
| `PATIENT` | Portal paciente / mobile |
| `PROFESSIONAL` | Portal profesional / mobile |
| `ADMIN` | Panel admin |

Definidos en el token de auth (`apps/api/src/lib/auth.ts`).

## Acceso y verificación

- Registro crea usuario; verificación de email vía token (TTL documentado en flujos de auth).
- Si `EMAIL_VERIFICATION_REQUIRED=true`, onboarding/portal se bloquean hasta verificar (`estado-actual-funcionalidades.md` + módulo `auth`).
- En desarrollo puede existir bypass de verificación (no usar en prod).

## Paciente — intake y seguridad

- Intake clínico obligatorio antes del flujo completo de matching/reserva (README / estado actual).
- Screening de riesgo: si se detecta riesgo, se **bloquea** la reserva (documentado en README y estado actual).
- **IA paciente (intake + portal/app)** — decisión de dirección (2026-09-09): **híbrido**. Abrir a pacientes con (1) **techo de consumo** (límites $ / tokens a definir) y (2) mezcla de **IA + preguntas tipo FAQ** (respuestas/guías más baratas o fijas) para no depender solo de LLM en cada turno. Flags de entorno siguen en código; números de techo y diseño FAQ = pendiente de implementación — ver [PENDING_TASKS.md](./PENDING_TASKS.md).

## Matching

- El score se calcula en **backend**, no en el front.
- Endpoint paciente: `GET /api/profiles/me/matching` (idioma `es|en|pt`).
- Directorio sin score de paciente: `GET /api/profiles/professionals`.
- Factores de scoring (README + `matching.service.ts`): temas del intake, keywords del perfil profesional, enfoque terapéutico, idioma, ventana de disponibilidad, experiencia, ajuste por rating; preferencias adicionales según implementación actual.
- El front ordena/filtra el ranking del servidor; no duplica la lógica de score.
- Datos de card configurables por admin vía `system_config` → `professional-display-overrides` (país de nacimiento/bandera, precio USD, rating, duración, conteos de pacientes/sesiones).
- Asignación de profesional activo del paciente: `system_config` → `patient-active-assignments` (referenciado en fulfillment dLocal).

## Precios y catálogo

- Precios de catálogo / sesión profesional se manejan en **USD** (centavos en persistencia típica).
- Onboarding profesional: precio único en USD (con display/conversión local donde aplique).
- Display al paciente: moneda según **país de residencia** (`packages/types/src/patientDisplayCurrency.ts`).
- Países dolarizados en display/cobro dLocal: **EC** y **PA** → USD.
- Redondeo de montos locales (no USD): **ceil** al múltiplo de **500** (`PATIENT_LOCAL_PRICE_ROUND_STEP` / `ceilUsdToLocalMajor` en `@therapy/i18n-config`). Display y cobro dLocal deben usar la misma regla — ver [DLOCAL.md](./DLOCAL.md).
- **Paquetes comerciales (2026-09-09):** packs definidos **4 / 8 / 12** sesiones (con descuento de paquete). También se pueden comprar **sesiones sueltas**; en ese caso **no** aplican los descuentos por paquete. Los **% de descuento** de cada pack son **tentativos / en revisión** — no fijar números en esta doc; viven en admin/catálogo.

## Paquetes, créditos y compras

Modelos: `SessionPackage`, `PatientPackagePurchase`, `CreditLedger`.

- Un paquete define créditos (`SessionPackage.credits`).
- La compra del paciente guarda `remainingCredits` / `totalCredits`.
- Tipos de movimiento en ledger (schema): `PACKAGE_PURCHASE`, `SESSION_CONSUMED`, `SESSION_REFUND`, `PENALTY`, `ADJUSTMENT`.
- Tras pago aprobado, el fulfillment acredita créditos (`packagePurchaseFulfillment` / checkout dLocal).
- Snapshot FX en compra: columnas en `PatientPackagePurchase` para liquidar al rate del momento del cobro (schema + deuda en [PENDING_TASKS.md](./PENDING_TASKS.md)).

## Reservas (bookings)

- Reserva real en DB; evita doble toma de slot con **lock distribuido** (Redis / TTL configurable).
- Se guardan timezones de paciente y profesional al reservar.
- Consumo:
  - Con créditos: decrementa `remainingCredits` y asocia `consumedPurchaseId` / `consumedCredits`.
  - **Trial**: puede reservarse sin consumir crédito de paquete (`consumedCredits === 0` / sin purchase), sujeto a reglas de prueba y prueba de pago cuando aplica.
- Reprogramación y cancelación implementadas; devolución de crédito / trial según ventanas de aviso (`booking notice` en types/utils).
- El profesional puede marcar sesión completada.
- Sesión completada alimenta registros financieros (`FinanceSessionRecord`).

## Chat

- Hilos y mensajes en MySQL.
- Dedupe por par paciente–profesional.
- El paciente solo chatea con profesionales permitidos por relación real (no directorio abierto arbitrario).

## Video

- Sesiones vía Daily (`VideoSession`); Meet posible si hay Google Calendar conectado.

## Finanzas y payouts

- Comisión de plataforma en sesiones **no trial**: dirección tentativa **~25%** (2026-09-09), **en revisión** y tratada como **comisión viva**. Puede arrancar **más baja** al inicio (estilo captura de usuarios / Uber–Amazon) y subir puntos después. En producto es **configurable en admin** — no hardcodear 25% como contrato cerrado.
- **Trial (2026-09-09):** regla **vigente hoy** = MotivarCare se queda con **el 100%** del cobro del trial. Estado: **en revisión** (puede cambiar). Implementación alineada con finanzas configurables / retención plataforma — ver admin finance.
- Corridas de pago: `FinancePayoutRun` + `FinancePayoutLine`.
- Admin: filtros, KPIs, eventos Stripe/outbox y reintentos (módulo finance/admin).
- Earnings del portal profesional: históricamente lógica simplificada vs ledger completo (`estado-actual` marca parcial).

## Mercados y cobro (dirección)

- **AR primero**, luego expansión LATAM con dLocal (orden TBD), después USA/Stripe con escala — ver [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md).
- **Oficial LATAM:** **dLocal Go** (hoy en sandbox) — [DLOCAL.md](./DLOCAL.md). Confirmado 2026-09-09.
- **Etapa 2 — USA:** **Stripe** (planificado; código aún presente en API).
- Si el país de residencia **no** está en cobertura dLocal Go → mensaje de checkout no disponible (`DLOCAL_CHECKOUT_UNAVAILABLE_ERROR`).
- Mercado Pago: **congelado** (posible más adelante; no ahora).

## Contenido y configuración

- `SystemConfig`: overrides de display profesional, asignaciones activas, reglas financieras, contenido web, etc.
- Landings y admin gestionan reviews/blog/settings según módulos `web-content` / admin.

## Datos personales / retention (abierto)

- **(2026-09-09/10)** Política de **cuánto tiempo se guardan** y **cuándo se borran** datos de pacientes (chat, intake, diario, pagos, etc.): **no definida**. No se evaluó aún qué ley aplica (p. ej. Argentina / otros LATAM). Dejar como TBD legal — no inventar plazos en esta doc.

- Controles nuevos: border-radius ~8px (no pills) — `.cursor/rules/ui-corner-radius.mdc`.
- CSS paciente por dominio/pantalla — `css-limpieza-estado.md`.

## Fuentes principales

- `apps/api/prisma/schema.prisma`
- `apps/api/src/modules/{bookings,profiles,payments,finance,auth}/`
- `packages/types/src/{dlocalGoCoverage,patientDisplayCurrency}.ts`
- `packages/utils/src/{sessionPriceArs,displayFx}.ts`
- `README.md` (matching), `docs/estado-actual-funcionalidades.md`, [DLOCAL.md](./DLOCAL.md)
