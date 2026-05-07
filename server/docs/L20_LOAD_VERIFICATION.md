# L20 — Load testing & soft-launch capacity verification

Safe **local/staging** load exercises only: no production destructive tests, no live Stripe charges, no live Reloadly unless you explicitly point env at live credentials (not recommended for load drills).

## Strategy overview

| Surface | Mechanism |
|---------|-----------|
| API liveness | Concurrent `GET /health` via `npm run load:sim:prod-readiness` (`scripts/load-sim-production-readiness.mjs`) |
| Readiness + queue depth | `GET /ready` includes `phase1FulfillmentQueue` counts (`phase1FulfillmentQueueObservation.js`); optional concurrent `/ready` in the same script (`LOAD_SIM_READY_CONCURRENCY`; use `OPS_HEALTH_TOKEN` when `PRELAUNCH_LOCKDOWN=true`) |
| Money path (mock provider) | `npm run phase1:money-path-load` — in-process app, synthetic Stripe secrets, `AIRTIME_PROVIDER=mock` default |
| DB pressure (read-only ping storm) | `node scripts/phase1-scale-sanity.mjs` — `SELECT 1` latency percentiles + throughput hints |
| Wallet idempotency throughput | `npm run load:wallet:replay` / `load:wallet:apply` — parallel POSTs with shared vs unique idempotency keys |
| Rate limits / burst abuse | Unit/integration tests (`webtopAbuseAndRate.test.js`, `riskPaymentIntent.test.js`, …) |
| Parallel checkout idempotency | `transactionFortressConcurrency.integration.test.js`, `walletTopupIdempotency.integration.test.js` |

## Commands (from `server/`)

```bash
npx prisma validate
npm run load:sim:prod-readiness
# optional readiness burst (API must be running); token required if PRELAUNCH_LOCKDOWN:
#   LOAD_SIM_READY_CONCURRENCY=20 OPS_HEALTH_TOKEN=… LOAD_SIM_BASE_URL=http://127.0.0.1:8787 npm run load:sim:prod-readiness

npm run phase1:money-path-load          # requires DATABASE_URL; mock airtime by default
node scripts/phase1-scale-sanity.mjs    # DATABASE_URL; DB ping only

npm run load:wallet:replay              # BASE_URL + wallet auth env — replay semantics under concurrency
npm run gate:check:scale                # scale readiness checklist (strict in CI as configured)
```

## Metrics visibility under load

- **`GET /metrics`** — Prometheus text when `METRICS_PROMETHEUS_ENABLED=true` (`health.routes.js`).
- **`GET /ready`** — `opsMetrics`, `webTopupMetrics`, `phase1FulfillmentQueue`, payment checkout 24h histogram (`health.routes.js`).
- **Token JSON** — `GET /internal/metrics` with ops token (`internalPhase1MissionMetrics.routes.js`).
- **Cross-replica aggregation** — `METRICS_REDIS_AGGREGATION` (see `gate-check.mjs` warnings).

## DB / Redis pressure risks (qualitative)

- **Postgres**: Connection pool size vs concurrent webhooks + canonical reads (`phase1-money-path-load.mjs` models worst-case fanout). Run `phase1-scale-sanity` on the **same network path** as production DB before trusting latency.
- **Redis**: Rate-limit store when `RATE_LIMIT_USE_REDIS=true`; BullMQ queue when `FULFILLMENT_QUEUE_ENABLED=true`. Queue depth surfaced on `/ready`; worker capacity scales with **additional worker processes**, not duplicate dispatch per order (`phase1-scale-sanity.mjs` report text).

## Soft-launch capacity target (defined)

Capacity is **SKU- and region-dependent**; the repo defines a **verification process** and **conservative defaults**, not a single universal RPS SLA:

1. **Staging validation**: `load:sim:prod-readiness` (default 100 concurrent `/health`) succeeds without elevated error rate; optionally enable `/ready` burst with `LOAD_SIM_READY_CONCURRENCY` ≤ 50.
2. **Money-path ceiling hint**: `phase1-scale-sanity.mjs` JSON output includes practical webhook throughput order-of-magnitude guidance (CPU + Postgres + Stripe verify bound).
3. **Operational throttle**: soft launch uses `SOFT_LAUNCH_MODE`, allowlists (`OWNER_ALLOWED_EMAIL`), and gates (`npm run soft-launch:gate`, `gate:check:scale`) — see `docs/DEPLOYMENT_READINESS.md` §8–10 and `src/lib/softLaunchGate.js` checklist.

**Recommendation**: Treat initial production traffic as **low tens of concurrent checkout sessions** until staging load + `gate:check:scale` (strict) pass with real Redis, Postgres, and non-mock airtime only when you intentionally widen scope.

## No live-provider guard

- `phase1-money-path-load.mjs` sets synthetic Stripe keys and `AIRTIME_PROVIDER=mock` when unset.
- `load-sim-production-readiness.mjs` only performs HTTP GET/POST to URLs you supply (default `/health` on localhost).
