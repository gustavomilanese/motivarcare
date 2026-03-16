# Implementation Roadmap

## Fase A (inmediata)
- [x] Ledger financiero por sesión.
- [x] Comisión configurable.
- [x] Corridas de liquidación y líneas por profesional.
- [x] Marca de pagos por línea y cierre de corrida.
- [x] API versionada `/api/v1`.
- [x] Idempotencia en creación de corrida de payout.

## Fase B (próxima)
- [ ] Extraer módulo `finance` (router + service + repository).
- [ ] OpenAPI v1 publicado y versionado.
- [ ] Error contract uniforme (`code`, `message`, `requestId`).
- [ ] Agregados diarios para dashboards.
- [ ] Export CSV por filtros y por corrida de payout.

## Fase C (escala)
- [x] Webhooks Stripe productivos (firma + retries + DLQ) sobre outbox.
- [ ] Event bus para procesos asíncronos.
- [ ] Read replicas y cache selectiva.
- [ ] Feature flags por cliente móvil.
- [ ] Observabilidad completa (metrics + traces + alerting).
  Estado actual: `/metrics` y access logs JSON ya implementados. Falta dashboard, traces y alertas.

## Fase D (frontend modular, estado marzo 2026)
- [x] `AppRoot` reducido a bootstrap/orquestación en Admin, Patient y Professional.
- [x] Portales autenticados extraídos por app (`AdminPortal`, `MainPortal`, `ProfessionalPortal`).
- [x] Flujo de auth+onboarding profesional extraído a `ProfessionalAuthFlow`.
- [x] `MobileOnboardingSteps` dividido en grupos (`mobile-steps/*`) para mantenimiento incremental.
- [x] Cliente HTTP compartido por factory (`createApiClient`) reutilizado por los 3 portales.
- [x] Páginas operativas grandes (`PatientsOpsPage`, `UsersPage`, `ProfessionalsOpsPage`) partidas en componentes de sección/modales para bajar tamaño y acoplamiento.
- [x] `ProfessionalWebOnboardingWizard` desacoplado con hook de dominio (`useProfessionalWebOnboardingWizard`) para separar estado/efectos del render.
- [ ] Normalizar tests de módulos críticos de UI (smoke + flujos de alta/edición).
- [ ] Publicar guía de convenciones de módulos (`pages/components/hooks/services/types`) para futuras apps nativas.

## Definition of Done (por feature)
1. Contrato API documentado.
2. Índices y migraciones revisadas.
3. Pruebas de concurrencia/idempotencia.
4. Dashboard y logs de operación.
5. Rollback plan.
