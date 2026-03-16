# Integrations and Connections

## Dependencias externas
- **MySQL**: datos transaccionales principales.
- **Redis**: cache, colas y coordinación.
- **Stripe**: checkout, cobros, reembolsos, webhooks.
- **Daily**: sesiones de video.
- **Object Storage (recomendado)**: multimedia/documentos.

## Conexiones y flujos críticos
1. Compra paquete (patient -> payments -> Stripe -> webhook -> créditos/ledger).
2. Reserva sesión (patient -> bookings -> disponibilidad -> booking).
3. Cierre sesión (admin/prof -> booking COMPLETED -> finance record).
4. Liquidación (admin -> payout run -> payout lines -> mark paid -> close run).

## Seguridad de conexiones
- Secrets por entorno (no hardcode).
- Rotación de claves Stripe/Daily.
- Webhook signature verification obligatoria.
- TLS end-to-end en entornos no locales.

## Observabilidad de integraciones
- Medir latencia y error rate por proveedor.
- Colas de reintento para errores transitorios.
- DLQ para eventos no procesables.

## Checklist producción
- [x] Stripe webhook con validación de firma (cuando `STRIPE_WEBHOOK_SECRET` está configurado).
- [ ] Persistencia de eventos webhook e idempotencia.
- [ ] Storage externo para media (evitar `data:` en DB a escala).
- [ ] Políticas de retención y borrado de datos.
