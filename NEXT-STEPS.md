# Próximos pasos — para retomar el lunes 27/04/2026

> Resumen de lo cerrado el viernes 25/04 y lo que toca el lunes.
> Borrar este archivo cuando todos los ítems estén ✅.

---

## 1. Lo que se pusheó el viernes (3 commits)

| Hash | Qué incluye |
|---|---|
| `b7e4ddb` | **Chat IA conversacional** como alternativa al wizard del paciente + matcher extendido (`language`, `availability`, `therapistPreferences`) |
| `9d0140a` | **Onboarding profesional con precio único en USD** + tipo de cambio ARS automático (Bluelytics → DolarAPI fallback) + Turnstile + opciones de onboarding ampliadas |
| `f70ba18` | **Snapshot FX en `PatientPackagePurchase`** (5 columnas nullable). Necesario para liquidar al psicólogo al rate del momento del cobro, sin importar cómo se mueva el dólar después |

Push disparó deploys de Railway (API + outbox) y Vercel (apps front).

---

## 2. Verificaciones del lunes (smoke tests, 5-10 min)

- [ ] **Railway terminó el deploy sin errores.** Revisar logs por errores tipo `prisma db push` (las 5 columnas FX nuevas deberían haberse creado en `PatientPackagePurchase`).
- [ ] **Env vars en Railway PROD configuradas:**
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL` = `gpt-5-mini` (o el que elijas)
  - `INTAKE_CHAT_ENABLED` = `false` (todavía no lo abrimos a usuarios reales)
  - `INTAKE_CHAT_PROVIDER` = `openai`
  - `TURNSTILE_SECRET_KEY` (la del onboarding profesional)
  - **NO** poner `USD_ARS_RATE_OVERRIDE` en prod (que use Bluelytics real)
- [ ] **Smoke chat IA:** entrar al onboarding del paciente en prod → no debería verse el chooser entre "wizard" y "chat" (porque `INTAKE_CHAT_ENABLED=false`). El wizard tradicional sigue como única opción visible.
- [ ] **Smoke onboarding profesional USD único:** arrancar onboarding nuevo (web o mobile) → en el paso 5 debería pedir solo precio USD y mostrar la conversión a ARS al lado.
- [ ] **Smoke FX rate público:**
  ```bash
  curl https://<api-url>/api/public/fx/usd-ars
  # → { "rate": <numero entre 1300 y 1600> }
  ```
- [ ] (Opcional) **Smoke compra de paquete USD:** simular checkout Stripe en USD → verificar que en `PatientPackagePurchase` quedó cargado `packagePriceUsdCentsSnapshot = packagePriceCentsSnapshot`, `fxProviderSnapshot = "n/a"`, `paymentProviderSnapshot = "stripe"`.

---

## 3. Mercado Pago — empezar esta semana (operativo, sin código)

Ir avanzando los pasos OPERATIVOS de la cuenta MP. La integración técnica la hacemos juntos cuando tengas el `ACCESS_TOKEN_TEST`.

### a. Cuenta y verificación

- [ ] Decidir con qué CUIT cobrar (idealmente la SAS/SRL de MotivarCare; si no, CUIT personal y migrar después).
- [ ] Abrir cuenta **Mercado Pago Business** en mercadopago.com.ar asociada a ese CUIT.
- [ ] Verificar identidad (DNI + selfie + comprobante domicilio). Tarda 24-48h.
- [ ] Cargar CBU/CVU para que MP transfiera lo cobrado al banco.
- [ ] Configurar actividad económica: "Servicios profesionales / salud".

### b. Decisión clave: modo de cobro

**Recomendación: empezar con MODO SIMPLE.**

- **Modo simple:** todo se cobra a la cuenta MotivarCare, vos liquidás manualmente al psicólogo cada mes. El snapshot FX que ya hicimos cubre exactamente este caso.
- **Modo marketplace** (Mercado Pago Connect): cada psicólogo conecta su cuenta MP, MP hace split automático. Más complejo, lo dejamos para cuando haya volumen (~50-100 sesiones/mes).

### c. Credenciales para la integración

Una vez verificada la cuenta, ir a [mercadopago.com.ar/developers](https://www.mercadopago.com.ar/developers) → "Tus integraciones" → crear app y obtener:

```
TEST (sandbox):
  - MP_ACCESS_TOKEN_TEST
  - MP_PUBLIC_KEY_TEST

PROD:
  - MP_ACCESS_TOKEN_PROD
  - MP_PUBLIC_KEY_PROD
```

### d. Cuando tengas el `ACCESS_TOKEN_TEST` → integración técnica

Estimado: **2-3 días de trabajo del agente.** Plan acordado:

- Backend: `POST /api/payments/mercadopago/preference` (crear checkout) + `POST /api/payments/mercadopago/webhook` + handler `processMercadoPagoApproved` que reusa `computeFxSnapshot()` (ya está hecho).
- Tipo de checkout: **Checkout Pro** (MP hosteado, paciente redirige y vuelve). Cero PCI, lo más rápido.
- Frontend `apps/patient`: si `market === "AR"` → botón "Pagar con Mercado Pago"; otros mercados → seguir con Stripe.
- QA en sandbox MP con tarjetas de prueba antes de tocar prod.

---

## 4. Deuda técnica abierta (ítems sueltos para cuando haya tiempo)

- [ ] **Limpieza Stripe-ARS:** la rama de Stripe en ARS de `apps/api/src/modules/payments/payments.routes.ts` es código aspiracional que en prod no se va a usar (AR irá por MP). Conviene removerla / marcarla como no soportada para evitar confusión.
- [ ] **PR-B3 (cuando arranque liquidación):** propagar el FX snapshot de `PatientPackagePurchase` a `FinanceSessionRecord` cuando se consume una sesión. Permite reportes "cuánto generó cada profesional en USD reales" sin re-cotizar.
- [ ] **Outbox worker separado:** hoy corre embebido en el mismo proceso de la API. Cuando crezca el volumen de eventos (Stripe + MP + emails), separar a un proceso dedicado (`npm run start:outbox` ya existe, falta crear el servicio en Railway).
- [ ] **Sociedad legal MotivarCare:** si todavía no está, abrir SAS/SRL antes de empezar a cobrar en producción. Afecta a quién factura MP, a quién pertenece la cuenta bancaria, etc.

---

## 5. Contexto si retomás con otro agente (o conmigo en sesión nueva)

- Stack: monorepo npm con `apps/{api,patient,patient-mobile,professional,admin,landing}` + `packages/types`.
- API: Express + Prisma + Postgres (Railway). Worker outbox embebido.
- Pagos hoy: solo Stripe (USD). Mercado Pago en planificación para AR (ARS).
- FX: `getUsdArsQuote()` en `apps/api/src/lib/usdArsExchange.ts` con cache 15min. Helper `computeFxSnapshot()` en `apps/api/src/lib/fxSnapshot.ts` ya provider-agnostic.
- Política de FX al psicólogo: **se le paga al rate del momento de la transacción del paciente, no al rate del momento del payout.** Esto justifica todo el snapshot.

---

_Última actualización: viernes 25/04/2026 después del push de `f70ba18`._
