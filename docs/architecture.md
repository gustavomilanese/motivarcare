# Arquitectura inicial (MVP)

## Contexto
Plataforma de terapia online para USA con tres superficies:
- Paciente
- Profesional
- Admin

Modelo comercial inicial: paquetes de sesiones.

## Componentes
- `apps/patient-web`: onboarding, matching, booking, chat y perfil de paciente.
- `apps/professional-web`: agenda/slots, perfil publico, video, chat e ingresos.
- `apps/admin-web`: politicas, soporte operativo, auditoria y reportes.
- `apps/api`: backend modular.
- `packages/types` y `packages/ui`: contratos y piezas compartidas.

## Modulos backend
- `auth`: registro/login y sesion.
- `profiles`: perfil de paciente/profesional + matching.
- `availability`: slots y bloqueos.
- `bookings`: reserva, cancelacion y no-show.
- `payments`: Stripe checkout + webhooks + creditos.
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
- Politicas de negocio (cancelacion, penalidades, creditos) en configuracion editable.
