# MotivarCare — dLocal Go

Última actualización: **2026-09-09**.  
Fuente primaria: código + `.cursor/rules/dlocal-payments-qa.mdc`.

## Decisión de negocio (confirmada 2026-09-09)

- **dLocal Go es el camino oficial de cobro para LATAM** (países de cobertura en este doc).
- **Foco comercial:** **AR primero**; luego otros LATAM vía dLocal (orden de países **TBD**); **USA + Stripe** cuando haya escala (etapa 2).
- **Stripe** no es el proveedor oficial de la etapa LATAM.
- Mercado Pago: **congelado** (2026-09-09). No es el plan actual; podría revisarse más adelante. No documentar como integración activa.

## Estado técnico

| Ítem | Estado |
| --- | --- |
| Integración checkout dLocal multi-país | **Implementada** en API + portal paciente |
| Entorno de trabajo | **Sandbox** (`https://api-sbx.dlocalgo.com`) |
| Producción live | **No** asumida; requiere credenciales live + QA |
| Tests automatizados | Cobertura types / displayFx / FX API (ver abajo) |
| QA manual end-to-end | **Pendiente** (checklist) |

Stripe sigue en el código del módulo de pagos (legado / preparación etapa 2). Este documento cubre dLocal Go y la FX de display/cobro LATAM.

## Credenciales y env

| Variable | Uso |
| --- | --- |
| `DLOCALGO_API_URL` | Default sandbox en `.env.example` / `apps/api/src/config/env.ts` |
| `DLOCALGO_API_KEY` | API key sandbox |
| `DLOCALGO_API_SECRET` | API secret sandbox |

## Cobertura de países pagadores

Definida en `packages/types/src/dlocalGoCoverage.ts`:

`AR, BO, BR, CL, CO, CR, EC, GT, MX, PA, PY, PE, UY, ID, MY, KE, NG`

- Helpers: normalización ISO2, inferencia desde timezone IANA, chequeo `isDlocalGoPayerCountry`.
- Si no hay cobertura: error de producto `DLOCAL_CHECKOUT_UNAVAILABLE_ERROR`  
  (`"Online checkout is not available for your country of residence yet"`).

## Moneda de display

`packages/types/src/patientDisplayCurrency.ts`:

- Mapeo residencia → moneda (ej. CO→COP, AR→ARS, MX→MXN).
- **EC** y **PA** → **USD** (dolarizados).
- Lista de monedas con FX live pedible por el portal (`PATIENT_LIVE_FX_CURRENCY_CODES`).

## Modelo de precio

1. Catálogo / precio profesional en **USD**.
2. Conversión a moneda local con FX (prioridad cotización dLocal).
3. **Redondeo:** `ceil` al múltiplo de **500** (`PATIENT_LOCAL_PRICE_ROUND_STEP` / `ceilUsdToLocalMajor` en `@therapy/i18n-config`).
4. El mismo monto redondeado se usa en **display** y en **amount** enviado a dLocal (salvo cobro USD).

Implementación de cobro: `apps/api/src/lib/dlocalChargeAmount.ts` → `resolveDlocalChargeAmount`.

- Si la moneda de display es USD → cobra USD (mínimo razonable en majors).
- Si no → requiere rate `USD/<currency>`; si falta, falla el checkout (no inventa rate).

## FX

| Pieza | Path / endpoint |
| --- | --- |
| Agregación display rates | `apps/api/src/lib/usdDisplayFxRates.ts` (cache ~15 min) |
| Cliente dLocal FX | `apps/api/src/lib/dlocalGoFx.ts` — `GET /v1/currency-exchanges` |
| Público | `GET /api/public/fx/display-rates` (`public.routes.ts`) |
| Front paciente | `useDisplayFxRates` + formateo en `@therapy/i18n-config` (`displayFx.ts`) |
| Fallback | Estático / otros proveedores si dLocal no responde (según implementación de `usdDisplayFxRates`) |

También existe FX histórico ARS (`usdArsExchange`, Bluelytics/DolarAPI) usado en onboarding profesional / snapshots; no confundir con el pipeline multi-moneda dLocal.

## Checkout backend

`apps/api/src/modules/payments/dlocalGoCheckout.service.ts`:

- Crea/sincroniza checkouts dLocal para flujos de **paquete**, **sesión individual** y **trial**.
- Dispara fulfillment post-pago (créditos, historial).
- Puede asignar profesional activo si el paciente no tiene uno (`patient-active-assignments`).

Front tipico: llamadas desde `usePortalActions` / booking / matching hacia `/api/payments/dlocal/checkout` (o rutas equivalentes del módulo payments).

## Archivos clave (mapa)

| Área | Archivos |
| --- | --- |
| Cobertura países | `packages/types/src/dlocalGoCoverage.ts` |
| Display currency | `packages/types/src/patientDisplayCurrency.ts` |
| Redondeo / format | `packages/utils/src/sessionPriceArs.ts`, `displayFx.ts`, `currencies.ts` |
| Monto cobro | `apps/api/src/lib/dlocalChargeAmount.ts` |
| FX API | `usdDisplayFxRates.ts`, `dlocalGoFx.ts`, `public.routes.ts` |
| Checkout | `dlocalGoCheckout.service.ts` (+ rutas en `payments`) |
| Portal | `AppRoot.tsx`, `useDisplayFxRates.ts`, `usePortalActions.ts`, booking/matching |

## Tests automatizados (ya en repo)

- `@therapy/types`: cobertura dLocal + display currency por país
- `@therapy/i18n-config`: displayFx (COP, CLP, ARS, redondeos, locales)
- API: `usdDisplayFxRates.test.ts`

## QA manual pendiente (sandbox)

Checklist vigente (regla Cursor / pendiente de producto):

1. Intake con residencia (ej. **CO**) → precios en COP, múltiplos de 500.
2. Matching → precio profesional en moneda local.
3. Paquete individual, multi-sesión y **trial** → redirect sandbox con **amount = display** en moneda local.
4. Return post-pago → fulfillment + historial de compras.
5. País **sin** dLocal (ej. ES/US sin residencia cubierta) → mensaje claro, sin crash.
6. **EC** / **PA** → display y cobro en USD.
7. `GET /api/public/fx/display-rates` con API arriba; sin API, fallback estático.

## Deploy

- FX live en prod requiere API desplegada en Railway con el endpoint público.
- Credenciales sandbox ≠ live.
- No pushear salvo pedido explícito.

## Relación con otros proveedores

| Proveedor | Rol (negocio + código) |
| --- | --- |
| **dLocal Go** | **Oficial LATAM** — implementación multi-país (+ ID/MY/KE/NG en set de cobertura); sandbox hoy |
| **Stripe** | **Etapa 2 — USA**; código presente en API (webhooks/checkout/outbox), no es el cobro oficial LATAM |
| **Mercado Pago** | **Congelado** (2026-09-09): no es el plan actual; posible revisión futura |

## Fuentes

- `.cursor/rules/dlocal-payments-qa.mdc`
- Archivos listados arriba
- `docs/tecnologias-desa-prod.md`
