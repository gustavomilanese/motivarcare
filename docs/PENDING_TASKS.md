# MotivarCare — tareas pendientes

Última actualización: **2026-09-09**.  
Lista consolidada desde código, reglas Cursor y docs del repo. Cada ítem indica **fuente**. No incluye ideas inventadas.

Leyenda de estado:

- 🔴 Pendiente
- 🟡 Parcial / verificar
- ✅ Hecho (se deja solo si aclara drift entre docs)

---

## 1) Pagos — dLocal LATAM (oficial; prioridad actual)

**Decisión confirmada 2026-09-09:** dLocal = cobro oficial LATAM; **AR primero** → resto LATAM dLocal (ruta TBD) → USA/Stripe con escala. MP congelado.

Fuente: Gustavo + `.cursor/rules/dlocal-payments-qa.mdc` + [DLOCAL.md](./DLOCAL.md).

| Estado | Tarea |
| --- | --- |
| 🔴 | **QA manual sandbox** multi-país (checklist en DLOCAL.md): display local, matching, paquetes/trial, return/fulfillment, países sin cobertura, EC/PA USD, FX live |
| 🟡 | Credenciales / cutover **live** dLocal (después de QA sandbox) |
| 🟡 | Confirmar que prod Railway expone `GET /api/public/fx/display-rates` con tasas dLocal |

Implementación multi-país + FX + ceil×500: ✅ en código; gap = **QA y prod**.

---

## 2) Pagos — Stripe USA (etapa 2) y deuda histórica

| Estado | Tarea | Nota |
| --- | --- | --- |
| 🔴 | Stripe USA — etapa 2 (después de escala LATAM) | Decisión 2026-09-09; fuera de foco AR |
| 🟡 | Orden de expansión LATAM post-AR | **TBD** — solo “seguir LATAM con dLocal”; sin ranking de países aún |
| 🟡 | Alinear README / demos a “dLocal LATAM oficial; Stripe USA después” | Drift documental |
| 🔴 | Limpieza rama **Stripe-ARS** aspiracional en `payments.routes.ts` | Deuda histórica (ex-`NEXT-STEPS`); no es camino oficial |
| 🟡 | **Mercado Pago** | **Congelado** (2026-09-09): no ahora; tal vez más adelante |
| 🔴 | Propagar FX snapshot de `PatientPackagePurchase` → `FinanceSessionRecord` al consumir sesión | Deuda liquidación (ex-`NEXT-STEPS` PR-B3) |

---

## 3) Producto / flags

| Estado | Tarea | Fuente |
| --- | --- | --- |
| 🟡 | **IA paciente — híbrido** | **Dirección (2026-09-09):** abrir con **techo de consumo** + mezcla **IA / FAQs** (menos tokens). Falta: números de techo, qué FAQs cubren el intake/portal, y flags prod. |
| 🔴 | Evaluar pregunta explícita de síntomas en chat IA / paridad wizard | Deuda producto (ex-`NEXT-STEPS`) |
| 🟡 | Catálogo local residual `professionalsCatalog` en paciente | `estado-actual-funcionalidades.md` §4.2 |
| 🟡 | % de descuento por pack 4/8/12 | Packs definidos; **% tentativos / en revisión** (2026-09-09). No fijar números en doc. |
| 🟡 | Regla comercial **trial** | **Hoy:** MotivarCare **100%** del trial. **En revisión** (2026-09-09). |
| 🟡 | Placeholders admin (calendario/biblioteca/importaciones según rutas) | `estado-actual` § admin |

---

## 4) Infra / ops

| Estado | Tarea | Fuente |
| --- | --- | --- |
| 🟡 | Worker **outbox** como servicio Railway separado (`start:outbox`) | `DEPLOY.md` + deuda ops |
| 🟡 | **Entidad legal / facturación** | **(2026-09-09)** Todavía **no** hay sociedad. Intención tentativa: empezar con **Monotributo** y después sociedad. **No resuelto** — no bloquea la doc técnica, sí el cobro prod serio / cuenta dLocal live. |
| 🔴 | Retención / borrado de datos (pacientes) | **No definido** (2026-09-10). Incluye averiguar marco legal AR/LATAM. No inventar plazos. |
| — | Push controlado: no deploy sin pedido | `.cursor/rules/deploy-git-push.mdc` |

---

## 5) Frontend / mantenimiento

| Estado | Tarea | Fuente |
| --- | --- | --- |
| ✅ | Partición CSS patient &lt; ~1.5k por dominio | `docs/css-limpieza-estado.md` |
| 🔴 | Mismo patrón CSS en **professional** / **admin** si duele el monolito | `css-limpieza-estado.md` “qué sigue” |
| 🟡 | Dead CSS (`npm run css:dead`) pasada corta patient | Conversación + scripts css |
| 🟡 | Archivos aún grandes (landings/admin routes, etc.) | `estado-actual` §4.3 — revalidar tamaños actuales |

---

## 6) Preguntas de producto abiertas (pueden estar parcialmente resueltas)

Fuente: `docs/open-questions.md` (sin fecha de cierre). Contrastar con código antes de reabrir:

1. Catálogo de paquetes: **4 / 8 / 12** definidos; sesiones sueltas sin descuento de pack (2026-09-09)
2. Diferencia de precios por profesional (sí: precio en perfil / overrides)
3. Comisión plataforma y payouts (tentativa ~25%, viva/en revisión; configurable en admin)
4. Trial de sesión inicial (**hoy:** MotivarCare 100%; **en revisión**)
5. Proveedor email (Resend en stack actual)
6. Retención/borrado de datos personales: **no pensado aún**; desconocido qué ley aplica → **TBD legal** (2026-09-10)

---

## 7) Drift documentado (arreglar docs, no inventar features)

| Tema | Docs viejos dicen | Código / docs nuevos |
| --- | --- | --- |
| Base de datos | Docs viejos (ex-`NEXT-STEPS`) decían Postgres | Prisma **MySQL** + `tecnologias-desa-prod.md` |
| Cobro paciente | Stripe / MP para AR | **dLocal oficial LATAM**; Stripe = USA etapa 2; **MP congelado** |
| Marca | Motivarte en análisis 2026-03 | **MotivarCare** en ops |

`NEXT-STEPS.md` fue **borrado** (2026-09-10). README raíz reemplazado por índice corto → `/docs`.

---

## Orden sugerido (operativo)

1. Terminar **QA sandbox dLocal** (bloqueante para confiar en cobros).
2. Smoke prod de FX + checkout solo cuando haya push/deploy acordado.
3. Mantener Stripe USA y Mercado Pago fuera del foco (MP **congelado**).
4. Outbox separado + FX → finance records cuando arranque liquidación seria.
5. CSS professional/admin y dead CSS cuando haya tiempo de mantenimiento.

---

## Fuentes

- `.cursor/rules/dlocal-payments-qa.mdc`
- `docs/DLOCAL.md`, `docs/css-limpieza-estado.md`, `docs/estado-actual-funcionalidades.md`, `docs/open-questions.md`
- Código: `apps/api/src/modules/payments/`, `packages/types/src/dlocalGoCoverage.ts`
- `infra/deploy/DEPLOY.md`, docs del núcleo en `/docs`
