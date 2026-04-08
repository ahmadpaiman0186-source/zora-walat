# Scaling & resilience (honest engineering view)

Phase 1 is **PostgreSQL + optional Redis (BullMQ + metrics + DLQ)**. This is not multi-region or sharded storage.

## Bottlenecks (today)

| Layer | ~1k active users / hr | ~10k | ~100k |
|--------|----------------------|------|-------|
| **API** | Single mid-node + connection pool usually fine. | Horizontal replicas; **Redis metrics aggregation** on; watch DB pool saturation. | Many replicas; need pgBouncer / read replicas for analytics; rate limits tuned. |
| **PostgreSQL** | Contention on hot `PaymentCheckout` + `FulfillmentAttempt` rows under fortress-like parallel fulfillment. `fulfillmentDbLimiter` reduces stampedes. | Long transactions and wide scans (`reconciliationService`) must stay chunked. | Partitioning / archival of old checkouts; dedicated writer vs reader; careful index design. |
| **Worker** | `PHASE1_FULFILLMENT_WORKER_CONCURRENCY` × workers vs DB + provider rate limits. | Stalled job rate, Redis latency, **DLQ volume** → operator load. | Provider quotas dominate; circuit breakers; multi-queue by region/product (future). |
| **Redis** | Single node Memurai/Redis OK for queue + metrics hash. | Memory for DLQ list + metric keys; monitor **eviction** (should be none). | Redis Cluster or split: queue vs metrics; persistence policy for compliance. |

## Improvements applied in code

- **Cluster counters + HTTP latency histograms** in Redis when `METRICS_REDIS_AGGREGATION=true` (see `redisMetricsAggregator.js`, `opsMetrics.js`).
- **DLQ list** for exhausted BullMQ Phase 1 jobs (`phase1FulfillmentDlqService.js`).
- **Fail-fast production config** when queue or Prometheus is enabled without Redis aggregation where required (`criticalConfigValidation.js`).
- **Correlation ALS** on API + worker fulfillment (`correlationContext.js`, `requestContextMiddleware.js`).

## Breaking points (qualitative)

- **~1k sustained**: failures are usually misconfiguration, single slow query, or Redis blip — recoverable with runbooks.
- **~10k**: duplicate **money-path** risk rises without strict idempotency discipline; reconciliation findings must be staffed; metrics must be **cluster-level**, not per-pod guesses.
- **~100k**: this codebase as-is is **not** validated at that tier; requires load tests, HA Postgres, multi-cell architecture, and formal SLO/error budgets.

## Load testing (required before claiming scale)

- k6 or Locust against **checkout + webhook simulation** with realistic Stripe replay.
- Chaos: kill worker mid-job, Redis failover, DB failover drill.
- Track `zora_failure_intelligence_*`, DLQ depth, `paid_no_attempt` recon findings.
