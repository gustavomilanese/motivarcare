# System Architecture

## Objetivo
Escalar de un monolito modular a una plataforma multi-cliente (web + 2 apps nativas) sin romper velocidad de producto.

## Arquitectura actual
- Monorepo con frontends (`admin`, `patient`, `professional`, `landing`) y API Express + Prisma.
- Base MySQL única + Redis.
- Integraciones externas: Stripe (pagos), Daily (video).

## Arquitectura objetivo (12-18 meses)
- **API Gateway/BFF**: routing por cliente (`web`, `ios`, `android`) y versionado.
- **Core API (modular monolith)**:
  - `auth-access`
  - `profiles`
  - `booking-scheduling`
  - `payments-wallets`
  - `finance-ledger-payouts`
  - `chat-messaging`
  - `content-cms`
- **Async backbone**: colas/event bus para procesos pesados (webhooks, conciliaciones, notificaciones, analytics).
- **Read models** para dashboards y reporting financiero.

## Límites de dominio recomendados
1. **Identity & Access**: usuarios, roles, sesiones, políticas de acceso.
2. **Care Operations**: pacientes, profesionales, disponibilidad, reservas.
3. **Commerce & Payments**: paquetes, compras, créditos, Stripe.
4. **Finance**: ledger por sesión, comisión, liquidaciones, payouts.
5. **Comms**: chat, notificaciones, recordatorios.

## Patrones técnicos a adoptar
- Idempotency key en POST críticos.
- Outbox pattern para eventos de negocio desde DB.
- Retry + dead-letter para consumidores async.
- CQRS liviano en reportes (writes OLTP / reads agregadas).
- API versioning explícito (`/api/v1`).

## Topología de despliegue recomendada
- API stateless en réplicas horizontales.
- MySQL gestionado con réplicas de lectura.
- Redis gestionado para cache + colas.
- Object storage (S3 compatible) para media/documentos.
- CDN para assets públicos.

## No funcionales (objetivo)
- SLO API read: p95 < 250ms.
- SLO API write: p95 < 450ms.
- Disponibilidad: 99.9%.
- RPO: < 15 min, RTO: < 60 min.
