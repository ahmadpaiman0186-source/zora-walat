# Launch readiness (Phase 1 — Zora-Walat API)

Structured checklist for moving from staging drills to real-customer traffic. Fatal gates live in `src/config/productionSafetyGates.js` and `src/index.js`; this document captures **operational** discipline.

## Money path

- [ ] `NODE_ENV=production` with **no** `DEV_CHECKOUT_AUTH_BYPASS`.
- [ ] Stripe **live** keys in secret store; webhook endpoint verified; signing secret rotated if exposed.
- [ ] `AIRTIME_PROVIDER` and `WEBTOPUP_FULFILLMENT_PROVIDER` match the intended live/sandbox policy (`productionSafetyGates` blocks mock unless explicitly allowed).
- [ ] `RELOADLY_ALLOW_UNAVAILABLE_MOCK_FALLBACK` **false** in production when using Reloadly.

## Fulfillment & queue

- [ ] `REDIS_URL` set and reachable when `FULFILLMENT_QUEUE_ENABLED=true`.
- [ ] Dedicated `npm run worker:fulfillment` (or equivalent) deployed with same code **version** as API.
- [ ] `PHASE1_FULFILLMENT_WORKER_CONCURRENCY` tuned for DB + provider limits.
- [ ] Operator runbook for exhausted BullMQ jobs: correlate `jobId` (= checkout id), logs from `bullmq_failed_event`, and `reconciliationHints` on `/api/orders/:id/phase1-truth`.

## Observability

- [ ] Central logs with JSON parsing; trace/checkout id suffix conventions understood.
- [ ] `METRICS_PROMETHEUS_ENABLED=true` + **REDIS URL** + `METRICS_REDIS_AGGREGATION=true` when running **multiple API replicas with fulfillment queue** (cluster-wide `/metrics`).
- [ ] `/ready` monitored (DB + signals); alert on sustained `payment_checkout_health_unavailable` style gaps.
- [ ] Admin DLQ visibility: `GET /api/admin/fulfillment-dlq` (JWT); foundation recon: `GET /api/admin/reconciliation/phase1-fulfillment`.

## Customer trust

- [ ] Apps use `customerVisible` (list/detail) or `phase1Order.customerVisibleFulfillment` (canonical) for UX — not raw `failureReason` alone.
- [ ] Support trained on `needs_review` vs `failed` vs `provider_unavailable`.

## Still not launch-blocking in code (follow-up epics)

- Full reconciliation service automation, DLQ persistence, multi-instance metric aggregation, OTel/Prometheus remote write, admin replay UI, chaos/load testing, formal SLOs and incident runbooks.
