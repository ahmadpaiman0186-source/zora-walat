# L23 — Auto-scaling & horizontal deployment

This document closes **L23**: how API and workers scale independently, what Redis/Postgres guarantees exist, and what operators must configure for multi-instance production.

## Process model (API vs worker)

| Entry | Runtime kind | Purpose |
|-------|----------------|---------|
| **`start.js`** | `ZW_RUNTIME_KIND=api` (`registerApiRuntime.js`) | HTTP API only — `startApiRuntime()`. |
| **`fulfillment-worker.mjs`** | `ZW_RUNTIME_KIND=worker` (`registerWorkerRuntime.js`) | BullMQ consumers + background ticks — `startBackgroundWorkerRuntime()`. |

Deploy **at least two service types** in production: **API replicas** and **one or more worker processes**. Do not rely on a single Node process for both unless explicitly dev-only.

## Queue mode & Redis

- **`FULFILLMENT_QUEUE_ENABLED=true`** requires **`REDIS_URL`** in production (`criticalConfigValidation.js` → fatal if violated).
- BullMQ uses Redis for job visibility across API producers and worker consumers (`phase1FulfillmentQueue.js`, `phase1FulfillmentWorker.js`).
- Phase 1 fulfillment job payload includes **`traceId`** for cross-component correlation (`fulfillmentJobContract.js`).

## Same-order safety across instances

- **`acquireFulfillmentOrderPgAdvisoryLock`** — `pg_advisory_xact_lock(hashtext(order_id))` inside the fulfillment transaction (`fulfillmentProcessingService.js`). Serializes claim/processing for the same `PaymentCheckout` across API pods and worker pods.
- Fulfillment attempt rows + fortress/idempotency logic remain authoritative; the advisory lock prevents cross-instance races on the same order.

## Rate limits across replicas

- Set **`RATE_LIMIT_USE_REDIS=true`** with **`REDIS_URL`** so HTTP limiters share state (`rateLimits.js`, `RATE_LIMITING.md`).
- **`ZW_PRODUCTION_EXPECT_HORIZONAL=true`** (production) **fatal-exits** if `REDIS_URL` or `RATE_LIMIT_USE_REDIS` is missing (`deploymentProductionContract.js`, invoked from `serverLifecycle`).

## Metrics & multi-instance

- **`METRICS_PROMETHEUS_ENABLED`** with fulfillment queue in production: enable **`METRICS_REDIS_AGGREGATION=true`** for cluster-wide counters/histograms (`opsMetrics.js`, `redisMetricsAggregator.js`). Otherwise `/metrics` is per-replica only (`gate-check.mjs` warning; `scaleGateBlockers.js`).

## Worker concurrency

- **`FULFILLMENT_WORKER_CONCURRENCY`** (env) bounds parallel jobs **per worker process** (`env.js`, `phase1FulfillmentWorker.js`). Scale horizontally by **more worker replicas**, not unbounded concurrency per pod.

## Health / readiness for orchestration

- **`GET /health`** — cheap liveness (`health.routes.js`).
- **`GET /ready`** — DB checks + **`phase1FulfillmentQueue`** observation + ops snapshots (suitable for Kubernetes readiness when auth/`PRELAUNCH_LOCKDOWN` rules are satisfied).

## Related docs

- `docs/SCALING_AND_RESILIENCE.md` — bottlenecks & limits.
- `docs/DEPLOYMENT_READINESS.md` — checklist (Redis, rate limits, Bull Board).
- `docs/L20_LOAD_VERIFICATION.md` — load drills.
- `docs/RATE_LIMITING.md` — Redis-backed limiters.

## Tests & gates (verify locally)

- `npm run gate:check:scale` — scale intent checklist.
- `test/scaleGateBlockers.test.js`, `test/productionDeploymentPreflight.test.js`, `test/rateLimitRedisInit.test.js`.
- `npx prisma validate`.

---

*No live deploy or traffic generation is implied by this document.*
