# Runbooks (Zora-Walat API)

Operational entry points:

| Symptom | First checks |
|--------|----------------|
| Stuck paid orders | `GET /api/admin/reconciliation/phase1-fulfillment?limit=100`, `/ready` → `paymentCheckoutByOrderStatus24h`, worker logs, Redis queue depth |
| Exhausted BullMQ jobs | `GET /api/admin/fulfillment-dlq` (admin JWT), correlate `orderId` with Stripe PI |
| Metrics / SLO gaps | `GET /metrics` with `METRICS_PROMETHEUS_ENABLED` + `METRICS_REDIS_AGGREGATION` in prod |
| Webhook delays | Stripe Dashboard deliveries, `stripeWebhook` logs, idempotency on `StripeWebhookEvent` |

See also:

- [L38_SECURITY_FINDING_TRIAGE_AND_REMEDIATION_RUNBOOK.md](./L38_SECURITY_FINDING_TRIAGE_AND_REMEDIATION_RUNBOOK.md) — L38 security finding triage, remediation, retest, closure
- [../security/L38_SECURITY_REVIEW_PENTEST_COMPLIANCE_AUDIT_PLAN.md](../security/L38_SECURITY_REVIEW_PENTEST_COMPLIANCE_AUDIT_PLAN.md) — L38 audit / pentest plan (docs only)
- [INCIDENT_SCENARIOS.md](./INCIDENT_SCENARIOS.md)
- [SLO.md](./SLO.md)
- [BACKUP_RESTORE_DRILL.md](./BACKUP_RESTORE_DRILL.md) — staging backup/restore rehearsal, ledger-safe post-restore checks, RPO/RTO worksheet (no prod ledger `UPDATE`/`DELETE`)
- [../L25_BACKUP_RESTORE_READINESS.md](../L25_BACKUP_RESTORE_READINESS.md) — L25 gate scope; **NOT CLOSED** until drill evidence exists
- [RELOADLY_PRODUCTION_REHEARSAL.md](./RELOADLY_PRODUCTION_REHEARSAL.md) — sandbox vs prod boundary, preflight, escalation
- [RELOADLY_SANDBOX_GOLDEN_PATH.md](./RELOADLY_SANDBOX_GOLDEN_PATH.md) — bounded sandbox drill, pass/fail table
