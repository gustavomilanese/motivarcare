# MotivarCare — contexto de proyecto

Última actualización de este documento: **2026-09-09** (relevamiento del monorepo).  
Repo: `therapy-platform` (npm workspaces).

## Qué es

**MotivarCare** es una plataforma de terapia online con tres actores principales:

| Actor | Qué hace en el producto |
| --- | --- |
| **Paciente** | Registro, intake clínico, matching de profesionales, compra de créditos/paquetes, reserva de sesiones, chat, diario emocional, video de sesión |
| **Profesional** | Onboarding de perfil, agenda/disponibilidad, pacientes, chat, ingresos, perfil público editable |
| **Admin** | Usuarios, paquetes, finanzas/liquidaciones, contenidos web, configuración de sistema |

El nombre comercial actual en ops, mails y dominios es **MotivarCare** (`*.motivarcare.com`, `soporte@motivarcare.com`).  
**Motivarte** aparece en documentos de análisis de mercado (marzo 2026) y en emails demo de seed; no es el branding de producto actual.

## Alcance del monorepo

Un solo repo incluye:

- API Node (Express + Prisma)
- Portales web (paciente, profesional, admin)
- Landings públicas
- Apps Expo (paciente y profesional)
- Packages compartidos (tipos, UI, auth client, i18n/currency, patient-core)

Detalle técnico: [ARCHITECTURE.md](./ARCHITECTURE.md).

## Stack (verdad operativa)

Fuente alineada: `docs/tecnologias-desa-prod.md` + código.

| Pieza | Tecnología |
| --- | --- |
| Lenguaje | TypeScript, Node ≥ 20 |
| API | Express |
| DB | **MySQL** + Prisma (`apps/api/prisma/schema.prisma`) |
| Cache / locks / colas | Redis |
| Web | React + Vite |
| Móvil | Expo / React Native |
| Auth | Token bearer firmado (HMAC) + roles `PATIENT` \| `PROFESSIONAL` \| `ADMIN` |
| Mail | Resend |
| Calendario / Meet | Google Calendar |
| Video de sesión | Daily (y Meet si hay Calendar) |
| IA (intake / Maca / portal) | OpenAI — **híbrido** (techo + FAQs); abierto a pacientes cuando esté acotado el costo |
| Pagos LATAM (oficial) | **dLocal Go** — ver [DLOCAL.md](./DLOCAL.md). Trabajo actual en **sandbox** |
| Pagos USA (etapa 2) | **Stripe** — planificado; no es el cobro oficial de la etapa LATAM |

> **Decisión de negocio (confirmada 2026-09-09):** dLocal es el camino oficial de cobro para LATAM. Stripe queda para USA en una etapa posterior. El `README.md` de la raíz aún puede hablar de Stripe como principal: preferir este documento + [DLOCAL.md](./DLOCAL.md).

## Idiomas y moneda

- UI multilenguaje: **es / en / pt** (portales).
- Catálogo de precios interno en **USD**.
- Display y cobro dLocal: moneda según **país de residencia** del paciente (con redondeo y FX documentados en [DLOCAL.md](./DLOCAL.md) y [BUSINESS_RULES.md](./BUSINESS_RULES.md)).

## Capacidades que el código / docs recientes respaldan

Sin inventar features nuevas; resumen basado en módulos API, Prisma y docs de estado:

- Auth real (registro, login, `me`, verificación de email configurable)
- Perfiles paciente / profesional (incl. diplomas, overrides de display vía `system_config`)
- Intake paciente (+ variante chat IA detrás de flag)
- Matching **server-side** con score y razones
- Disponibilidad, reservas, cancelación/reprogramación, consumo de créditos
- Chat paciente–profesional persistido
- Paquetes, compras, ledger de créditos
- Checkout dLocal (paquete / individual / trial) + fulfillment
- Finanzas admin (sesiones, payouts, outbox)
- Diario emocional, treatment/intake chat, video sessions
- Contenido web / landings

Detalle de reglas: [BUSINESS_RULES.md](./BUSINESS_RULES.md).  
Estado histórico por actor (marzo 2026): `estado-actual-funcionalidades.md` — contrastar con pendientes actuales en [PENDING_TASKS.md](./PENDING_TASKS.md).

## Ambientes

| Ambiente | Cómo corre |
| --- | --- |
| **Desarrollo** | Docker (MySQL local), API `:4000`, fronts Vite; `npm run dev` = API + paciente |
| **Producción** | Push a `origin` (p. ej. `main`) → **Railway** (API + MySQL/Redis + worker outbox) y **Vercel** (web/landings). Dominio API típico: `api.motivarcare.com` |

Regla de equipo: no pushear salvo pedido explícito (`.cursor/rules/deploy-git-push.mdc`).

## Mercados (dirección confirmada 2026-09-09)

- **Ahora / primero:** **Argentina (AR)**.
- **Después:** otros países de **LATAM** donde se pueda cobrar con **dLocal** (ruta exacta de países **aún no definida**).
- **Más adelante (etapa 2):** **USA** con **Stripe**, cuando haya la escala necesaria.
- Cobertura técnica dLocal ya incluye más países que el foco comercial actual — ver [DLOCAL.md](./DLOCAL.md).

- Marca de producto: **MotivarCare**.
- **Entidad legal (2026-09-09):** todavía **no** existe sociedad. Dirección tentativa (no cerrada): empezar operando con **Monotributo** y más adelante constituir sociedad. Tema **abierto** — no inventar CUIT ni razón social en esta doc.

## Documentos relacionados

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [BUSINESS_RULES.md](./BUSINESS_RULES.md)
- [DLOCAL.md](./DLOCAL.md)
- [PENDING_TASKS.md](./PENDING_TASKS.md)
- [tecnologias-desa-prod.md](./tecnologias-desa-prod.md)
