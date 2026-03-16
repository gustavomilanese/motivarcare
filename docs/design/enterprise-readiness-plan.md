# Plan de preparación para escalar (versión simple)

## Objetivo
Que la plataforma funcione bien hoy y siga funcionando cuando crezca fuerte (por ejemplo 1.000 usuarios conectados al mismo tiempo), sin frenar producto.

## Estado actual (resumen)
- Ya se ordenó el frontend por módulos (menos archivos gigantes, más mantenible).
- La base está lista para seguir creciendo sin rehacer todo.

## Qué implementamos ahora
1. Pruebas automáticas mínimas en Patient y Professional.
2. Script único de tests en raíz (`npm test`) para correr todo junto.
3. Base para seguir agregando pruebas de negocio de forma incremental.
4. Prueba de carga simple lista para correr (`npm run load:smoke`).
5. Rate limit distribuido (Redis con fallback a memoria) en API.
6. Endurecimiento de seguridad HTTP (headers + contrato uniforme para JSON inválido).
7. Access logs estructurados en API (activables por variable de entorno).

## Qué sigue (orden recomendado)

### Paso 1: Pruebas de flujos críticos
- Alta de profesional.
- Reserva/reprogramación/cancelación.
- Edición de perfil.
- Cobro y reflejo en finanzas.

Por qué: evita que una mejora rompa lo que ya funcionaba.

### Paso 2: Contrato de API estable
- Definir y publicar “qué entra y qué sale” en cada endpoint.
- Fijar reglas claras de errores para web, admin y futuras apps nativas.

Por qué: reduce errores entre equipos y acelera desarrollo mobile.

### Paso 3: Prueba de carga
- Simular 200, 500 y 1.000 usuarios concurrentes.
- Medir: tiempo de respuesta y porcentaje de error.

Por qué: detecta cuellos de botella antes de producción.

Comando base:
- `npm run load:smoke`

Variables útiles:
- `LOAD_BASE_URL` (default `http://localhost:4000`)
- `LOAD_DURATION_SECONDS` (default `20`)
- `LOAD_CONNECTIONS` (default `20`)
- `LOAD_PIPELINE` (default `1`)
- `LOAD_OVERALL_RATE` (default `4` req/s, evita chocar por defecto con el rate-limit)

### Paso 4: Monitoreo y alertas
- Tablero con métricas clave (errores, latencia, volumen).
- Alertas automáticas cuando algo se degrada.

Por qué: permite reaccionar rápido y no enterarse tarde por usuarios.

### Paso 5: Manual de incidentes y recuperación
- Procedimientos para caídas (login, pagos, BD).
- Prueba de restauración de backup.

Por qué: baja riesgo operativo y tiempo de caída.

## Cómo explicar esto a un inversor
"Ya hicimos la etapa de orden y modularización. Ahora estamos en etapa de blindaje: pruebas automáticas, contrato estable de API, monitoreo y pruebas de carga. Esto reduce riesgo técnico y permite crecer sin reescribir el producto."

## Cómo explicar esto a un arquitecto
"La arquitectura está separada por dominios y capas. El siguiente bloque es hardening: cobertura de tests de flujos críticos, contrato de API versionado, SLOs y observabilidad para escalar concurrencia con riesgo controlado."
