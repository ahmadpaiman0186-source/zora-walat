# Runbooks (Zora-Walat API)

Operational entry points:

| Symptom | First checks |
|--------|----------------|
| Stuck paid orders | `GET /api/admin/reconciliation/phase1-fulfillment?limit=100`, `/ready` → `paymentCheckoutByOrderStatus24h`, worker logs, Redis queue depth |
| Exhausted BullMQ jobs | `GET /api/admin/fulfillment-dlq` (admin JWT), correlate `orderId` with Stripe PI |
| Metrics / SLO gaps | `GET /metrics` with `METRICS_PROMETHEUS_ENABLED` + `METRICS_REDIS_AGGREGATION` in prod |
| Webhook delays | Stripe Dashboard deliveries, `stripeWebhook` logs, idempotency on `StripeWebhookEvent` |

See also:

- [INCIDENT_SCENARIOS.md](./INCIDENT_SCENARIOS.md)
- [SLO.md](./SLO.md)
- [RELOADLY_PRODUCTION_REHEARSAL.md](./RELOADLY_PRODUCTION_REHEARSAL.md) — sandbox vs prod boundary, preflight, escalation
- [RELOADLY_SANDBOX_GOLDEN_PATH.md](./RELOADLY_SANDBOX_GOLDEN_PATH.md) — bounded sandbox drill, pass/fail table
