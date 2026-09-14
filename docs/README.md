# Documentación MotivarCare

Índice de la documentación viva del monorepo `therapy-platform`.

La fuente de verdad de producto/pagos/arquitectura son los docs del **núcleo** abajo. El `README.md` de la raíz solo apunta acá.

## Núcleo (empezar acá)

| Documento | Contenido |
| --- | --- |
| [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) | Qué es el producto, actores, branding, stack y alcance |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Monorepo, apps, packages, API, datos, deploy |
| [BUSINESS_RULES.md](./BUSINESS_RULES.md) | Reglas de negocio (matching, créditos, reservas, finanzas) |
| [DLOCAL.md](./DLOCAL.md) | Pagos dLocal Go, FX, moneda local, archivos clave y QA |
| [PENDING_TASKS.md](./PENDING_TASKS.md) | Pendientes con fuentes |

## Operación y producto (existentes)

| Documento | Notas |
| --- | --- |
| [tecnologias-desa-prod.md](./tecnologias-desa-prod.md) | Desa vs prod (Vercel / Railway) |
| [estado-actual-funcionalidades.md](./estado-actual-funcionalidades.md) | Corte **2026-03-16** — pagos posiblemente desactualizados; contrastar con núcleo |
| [mvp-roadmap.md](./mvp-roadmap.md) | Roadmap MVP histórico |
| [open-questions.md](./open-questions.md) | Varias ya resueltas; ver [PENDING_TASKS.md](./PENDING_TASKS.md) |
| [css-limpieza-estado.md](./css-limpieza-estado.md) | Partición CSS del portal paciente |
| [infra/deploy/DEPLOY.md](../infra/deploy/DEPLOY.md) | Guía de despliegue Railway / fronts |

`NEXT-STEPS.md` (abril 2026) fue **eliminado** (2026-09-10): estaba desactualizado vs dLocal / decisiones confirmadas.

## Design / stakeholders

- [design/](./design/) — matching explicado, assets de diseño
- Análisis competitivos Mindly / Motivarte (marzo 2026): archivos `analisis-*` y `resumen-ejecutivo-*` en esta carpeta

## Convención

- **No inventar** features: si no está en código o en un doc fechado, no se afirma.
- Pagos: **dLocal = oficial LATAM** (**AR primero** → LATAM → USA/Stripe con escala). MP congelado. Detalle en [DLOCAL.md](./DLOCAL.md) y [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md).
