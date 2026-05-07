# Deployment readiness (production launch)

Use this checklist before scaling traffic (target: high concurrency, multi-replica).

## 1. Database

- [ ] All Prisma migrations applied: `npm run db:migrate` against production `DATABASE_URL`.
- [ ] Connection pooling configured at the proxy (PgBouncer / Neon / RDS pooler) — avoid unbounded serverless connections.
- [ ] Fulfillment claim safety: PostgreSQL `pg_advisory_xact_lock(hashtext(order_id))` runs inside the same transaction as `QUEUED` → `PROCESSING` claim (see `fulfillmentOrderPgAdvisoryLock.js`). No duplicate fulfillment for one checkout under concurrent workers.

## 2. Redis

- [ ] `REDIS_URL` set for BullMQ fulfillment queue, optional DLQ (`phase1-fulfillment-dlq-v1`), and rate-limit store when `RATE_LIMIT_USE_REDIS=true`.
- [ ] Memory / eviction policy suitable for queue depth (monitor `bull:*` key growth).

## 3. Queue (BullMQ)

- [ ] `FULFILLMENT_QUEUE_ENABLED=true` on API + worker processes.
- [ ] Retry policy: `FULFILLMENT_JOB_BACKOFF_STRATEGY=exponential` (see `env.js` defaults) or `custom` with `FULFILLMENT_JOB_RETRY_DELAYS_MS`.
- [ ] `FULFILLMENT_JOB_MAX_ATTEMPTS` tuned (includes first try + retries); exhausted jobs go to DLQ list + BullMQ DLQ queue (see worker `failed` handler).
- [ ] Worker concurrency: `FULFILLMENT_WORKER_CONCURRENCY` per process vs provider rate limits.

## 4. Secrets & keys

- [ ] Follow **`docs/SECRETS_MANAGEMENT.md`** — use **`server/.env.production.example`** as the key checklist; values live in a vault / host env (never committed).
- [ ] Run **`npm --prefix server run secrets:scan`** on release branches (no high-confidence secret-shaped strings in tracked sources).
- [ ] **Stripe live** (`sk_live_…`) only where `NODE_ENV=production` and launch gates allow; staging uses `sk_test_…`.
- [ ] `STRIPE_WEBHOOK_SECRET` matches the live Dashboard endpoint (one endpoint, one secret).
- [ ] `JWT_*` rotation procedure documented.

## 5. Environment validation

- [ ] Run `npm run preflight:production` (or your release gate) with production-like env.
- [ ] `OPS_HEALTH_TOKEN` length ≥ 16 when `PRELAUNCH_LOCKDOWN=true` (protects `/ready`, `/metrics` detail).

## 6. Rate limiting & abuse

- [ ] `RATE_LIMIT_USE_REDIS=true` for per-IP / per-user limits across replicas (`rateLimits.js`).
- [ ] Hosted checkout: per-user, per-IP composite, and per–idempotency-key velocity (`payment.routes.js`).
- [ ] Optional `ANTI_BOT_STRICT_HEADERS=true`: browsers send `Sec-Fetch-*`; apps send `X-ZW-Client: zw-flutter/1`.

## 7. Observability

- [ ] `LOG_LEVEL=error` in production to reduce noise (pino level in `app.js`).
- [ ] Money-path alerts wired (stderr JSON); metrics counters for SLA, fraud, recovery, provider mismatch.

## 8. Load & failure drills (staging)

- [ ] Run `npm run load:sim:prod-readiness` against staging base URL (health concurrency).
- [ ] Stripe: replay same `checkout.session.completed` event id — must remain idempotent (StripeWebhookEvent + ledger idempotency).
- [ ] Provider: inject failure burst in sandbox; confirm retries + DLQ + no double post.

## 9. Queue monitoring (Bull Board)

- [ ] **`GET /admin/queues`** — Bull Board UI for Phase 1 fulfillment + DLQ queues (mounted when Redis + queue enabled).
- [ ] Protect with **`ADMIN_SECRET`** or **`ADMIN_SECRET_CURRENT`** (Bearer / `X-Admin-Secret`) — same as WebTopup admin control.
- [ ] Optional **`ADMIN_ALLOWED_IPS`** for extra network restriction.

## 10. Soft launch & operator controls

- [ ] **`SOFT_LAUNCH_MODE=true`** — logs structured checkout attempts + **`GET /api/admin/soft-launch/summary`** (SLA breach count, recovery repairing count, flag snapshot).
- [ ] Limit **who** can use the app: **`OWNER_ALLOWED_EMAIL`** + **`ZW_REQUIRE_OWNER_ALLOWED_EMAIL=true`** (single allowed identity until you widen).
- [ ] **Manual overrides** (JWT admin): `GET /api/admin/orders`, `POST .../kick-fulfillment`, `POST .../mark-recovery-resolved`, manual-required safe-retry (`processingManual.routes.js`). Fraud/trust/recon fields appear on order payloads.

## 11. Success criteria mapping

| Criterion | Mechanism |
|-----------|-----------|
| No race on fulfillment | PG advisory xact lock + atomic `updateMany` claim |
| No duplicate charge | Stripe idempotency + webhook event dedupe |
| No duplicate fulfillment | Single QUEUED attempt design + claim atomicity + lock |
| Stable under load | Redis rate limits, queue backoff, worker concurrency caps |
| Alerts | `moneyPathAlert` + resilience logs + ops metrics |
| Manual override | Admin API + Bull Board + audit logs (`AuditLog`) |

## 12. Rollback & circuit breakers (no schema rewind by default)

- **Application**: redeploy the **previous container/image tag** or revert the release commit; API and **worker** must stay on the **same** build for queue/job compatibility.
- **Database**: prefer **forward** migrations (`npm run db:migrate` with a fix) over `migrate resolve --rolled-back` unless runbook-tested; keep backups before risky migrations.
- **Money-path freeze without redeploy**: set **`PAYMENTS_LOCKDOWN_MODE=true`** and/or **`PRELAUNCH_LOCKDOWN=true`** so new checkouts/top-ups return **503** while webhooks continue (see `env.js`).
- **Stripe**: Dashboard → disable or rotate webhook endpoint / signing secret during incident response.
- **Secrets**: rotate leaked keys in the vault first; then redeploy with new env (see **`docs/SECRETS_MANAGEMENT.md`**).

Env key checklist (no values in git): **`server/.env.production.example`**.
