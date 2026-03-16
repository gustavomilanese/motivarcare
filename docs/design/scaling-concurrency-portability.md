# Scaling, Concurrency and Portability

## Riesgos actuales
1. API monolítica con rutas grandes (e.g. admin).
2. Cálculos de reporting sobre tablas transaccionales en tiempo real.
3. Falta de jobs asíncronos para tareas pesadas.
4. Falta de contratos OpenAPI versionados para mobile.

## Recomendaciones inmediatas (0-30 días)
1. Versionado API formal (`/api/v1`) y congelar contrato.
2. Idempotencia en writes críticos (ya aplicado en payouts; extender a compras/bookings).
3. Agregar tabla de agregados diarios para finanzas.
4. Extraer módulo `finance` en API (services + repository).
5. Observabilidad mínima: logs estructurados, métricas por endpoint, trazas con request-id.

## Recomendaciones de escala (30-90 días)
1. Read replicas MySQL para dashboards/admin.
2. Cola de eventos (BullMQ/Kafka) para webhooks, conciliación y notificaciones.
3. Cache de consultas de alto tráfico (public/profiles/packages).
4. Circuit breakers y timeouts hacia Stripe/Daily.
5. Hardening de límites:
  - rate limit por usuario + IP
  - payload size
  - protección de N+1 queries.

## Concurrencia
- Usar transacciones en operaciones multi-entidad.
- Evitar doble ejecución con `idempotencyKey` + unique constraints.
- Para cambios críticos en estado, usar precondiciones (`WHERE status = X`).

## Portabilidad (web + iOS + Android)
- API agnóstica de cliente.
- Contratos estables + changelog.
- Feature flags por cliente/version.
- Error model único y localizable.

## SRE/Operación
- Health checks: live/ready.
- Graceful shutdown (ya presente).
- Backups automáticos + pruebas de restore.
- Alertas por latencia, error rate, colas y fallas de webhooks.
