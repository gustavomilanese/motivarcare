# Scaling and HA Checklist (Launch)

## Immediate (before launch)
1. Deploy API with at least 2 replicas behind a load balancer.
2. Use managed MySQL with automated backups and point-in-time recovery.
3. Use managed Redis (do not keep Redis as single local container in production).
4. Configure health checks:
   - Liveness: `/health/live`
   - Readiness: `/health/ready`
5. Set environment hardening:
   - `NODE_ENV=production`
   - `JWT_SECRET` strong random value
   - `CORS_ORIGINS` restricted to your frontend domains
6. Tune API protection by load tests:
   - `API_RATE_LIMIT_MAX_REQUESTS`
   - `API_MAX_INFLIGHT_REQUESTS`

## Near term (first 2-4 weeks)
1. Wire request metrics endpoint (`/metrics`) to dashboards (p95 latency, error rate, throughput).
2. Ship centralized logs with request id correlation (`x-request-id`) to your log stack.
3. Add alerting (availability, DB errors, latency spikes).
4. Move chat polling to websocket/event model to reduce repeated read load.
5. Keep outbox worker running as separate process and monitor dead-letter queue.

## Medium term
1. Add blue/green or rolling deployment strategy.
2. Extend idempotency keys already added in bookings/payments to more write-sensitive endpoints.
3. Add failover strategy for database region outages.
4. Introduce WAF/rate limiting at edge (CDN/load balancer).
