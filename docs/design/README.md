# Diseño Plataforma (v1)

Este directorio concentra la documentación técnica para escalar MotivarCare en backend web y apps nativas.

## Documentos
- `system-architecture.md`: arquitectura lógica/física, decisiones y límites de servicios.
- `data-model.md`: modelo de datos actual + target, entidades críticas e índices.
- `api-reference-v1.md`: contratos API para clientes web y mobile (`/api/v1`).
- `scaling-concurrency-portability.md`: estrategia de escalado, concurrencia, resiliencia y portabilidad.
- `integrations-and-connections.md`: conexiones externas (Stripe, Daily, Redis, DB), seguridad y observabilidad.
- `implementation-roadmap.md`: plan por fases con entregables y criterios de aceptación.

## Estado actual
- API `v1` habilitada en paralelo con rutas legacy (`/api/*` y `/api/v1/*`).
- Motor financiero por sesión implementado.
- Corridas de liquidación implementadas con idempotencia (`X-Idempotency-Key`).

## Principios de evolución
1. Mantener contratos estables para clientes mobile.
2. Backward compatibility por 2 versiones de API.
3. Idempotencia en operaciones mutantes críticas.
4. Eventual split a servicios cuando haya presión real de throughput/equipo.
