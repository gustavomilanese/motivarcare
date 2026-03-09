# Arquitectura inicial (MVP)

## Contexto
Plataforma de terapia online para USA con tres superficies:
- Paciente
- Profesional
- Admin

Modelo comercial inicial: paquetes de sesiones.

## Componentes
- `apps/patient`: onboarding, matching, booking, chat y perfil de paciente.
- `apps/professional`: agenda/slots, perfil publico, video, chat e ingresos.
- `apps/admin`: politicas, soporte operativo, auditoria y reportes.
- `apps/landing`: marketing y captacion.
- `apps/api`: backend modular.
- `packages/database`, `packages/auth`, `packages/types`, `packages/ui` y `packages/utils`: contratos y piezas compartidas.
- `infra/docker` y `infra/deploy`: infraestructura local y despliegue.

## Modulos backend
- `auth`: registro/login y sesion.
- `profiles`: perfil de paciente/profesional + matching.
- `availability`: slots y bloqueos.
- `bookings`: reserva, cancelacion y no-show.
- `payments`: Stripe checkout + webhooks + sesiones disponibles.
- `video`: creacion de sala por sesion (Daily).
- `chat`: mensajeria 1 a 1.
- `ai-audit`: auditoria de texto (fase 1) y audio (fase 2 con consentimiento).
- `admin`: KPIs y parametros operativos.

## Decisiones de producto iniciales
- Region: USA.
- Moneda: USD.
- Pago: Stripe.
- Cancelacion: sin cargo hasta 24h antes.
- Video: Daily (embebido interno).
- IA: texto primero con revision humana; audio en fase 2.

## Criterios de modularidad
- Cada modulo posee rutas/servicios/repositorios separados.
- Toda integracion externa (Stripe, Daily, IA) detras de puertos/adaptadores.
- Politicas de negocio (cancelacion, penalidades, sesiones disponibles) en configuracion editable.
