# Zora-Walat API (Node / Express + Prisma)

Entry: **`start.js`** (repo `server/start.js`) loads **`bootstrap.js`** (reads **`server/.env`**, then optional **`server/.env.local`**) then **`src/index.js`**.

## Health and metrics

- **`GET /health`** — liveness **JSON** `{ "status": "ok" }` (no dependencies); primary public probe for Vercel/serverless.
- **`GET /api/health`** — same liveness JSON for clients constrained to `/api/*` (no I/O).
- **`GET /ready`** — readiness JSON (DB + persistence checks, ops snapshots); returns 503 when unhealthy.
- **`GET /metrics`** — Prometheus text when `METRICS_PROMETHEUS_ENABLED=true`; otherwise 404.

## Quick start (Node 20+)

```bash
cd server
cp .env.example .env
# Edit .env: DATABASE_URL, JWT_* secrets, STRIPE_SECRET_KEY for checkout tests
npm install
npm start
```

Default listen: **`http://127.0.0.1:8787`** (`PORT` in `.env`).

**Stripe webhooks (local):** `docs/STRIPE_LOCAL_WEBHOOK_FLOW.md` — `stripe listen --forward-to http://127.0.0.1:8787/webhooks/stripe`, then paste the printed **`whsec_`** into `STRIPE_WEBHOOK_SECRET` and restart the API.

**Multi-instance rate limits:** optional **`RATE_LIMIT_USE_REDIS=true`** with **`REDIS_URL`** shares selected limiter buckets across replicas (`docs/RATE_LIMITING.md`).

Dev with auto-restart: `npm run dev`

Focused proof (PostgreSQL): `npm run verify:wallet-topup-idempotency` preloads `test/integrations/preloadTestDatabaseUrl.mjs`, which logs **`[zw-integration] Effective DB: …`**. **When `TEST_DATABASE_URL` is set, that URL replaces `DATABASE_URL` for the test process** — it must have **all Prisma migrations** applied. One command for the same URL tests use: **`npm run db:migrate:integration`**. (Plain `npm run db:migrate` uses `DATABASE_URL` from `.env` via bootstrap — if your shell also sets `TEST_DATABASE_URL`, prefer `db:migrate:integration` so you migrate the DB tests actually hit.) Ledger invariant reference: `docs/WALLET_LEDGER_INVARIANT.md`.

HTTP + JWT end-to-end (API must be running): `npm run verify:wallet` — see `docs/WALLET_TOPUP_LOCAL_VERIFY.md`. Authenticated load: `docs/WALLET_TOPUP_LOAD.md` (`npm run load:wallet:replay` / `load:wallet:apply`).

## Environment

- **Template:** `.env.example` (comments describe local vs production).  
- **Secrets:** never commit `.env` / `.env.local`. Optional **`stripe_secret.key`** (single line, gitignored) instead of `STRIPE_SECRET_KEY` in `.env`.  
- **Prisma:** `npm run db:validate` / `npm run db:migrate` — from `server/` so bootstrap loads env (see `.env.example` note). **`npm run db:migrate:integration`** — `migrate deploy` against `TEST_DATABASE_URL` if set, else `DATABASE_URL` (matches integration test preload; does not rely on bootstrap overriding the URL).

## Integration tests

Preflight (env summary, no DB connection): **`npm run test:integration:preflight`**. CI wiring: **`docs/CI_INTEGRATION.md`**. Full matrix: **`docs/INTEGRATION_AND_E2E_TESTS.md`**. Local CI-like: **`npm run ci:integration-verify`** (requires **`TEST_DATABASE_URL`**).

**Stripe HTTP webhook chaos** (`stripeWebhookHttpChaos.integration.test.js`): preloaded with **`test/integrations/registerChaosWebhookEnv.mjs`**, which forces a synthetic `STRIPE_WEBHOOK_SECRET`, a long dummy `STRIPE_SECRET_KEY` (no real Stripe fee retrieve), **`AIRTIME_PROVIDER=mock`**, **`WEBTOPUP_FULFILLMENT_PROVIDER=mock`**, and **`FULFILLMENT_QUEUE_ENABLED=false`** so a developer `server/.env` with Reloadly, real `sk_test`, and BullMQ enabled does not make the suite depend on a worker or live Stripe objects.

## Reloadly rehearsal

Operator runbook: **`docs/runbooks/RELOADLY_PRODUCTION_REHEARSAL.md`**. Bounded sandbox drill: **`docs/runbooks/RELOADLY_SANDBOX_GOLDEN_PATH.md`**. Static gates: **`npm run reloadly:golden-path-preflight`**, **`npm run reloadly:sandbox-readiness`**. CI truth vs local: **`docs/CI_VERIFICATION.md`**.

## Flutter client

API base URL for the Flutter app defaults in **`lib/core/config/app_config.dart`** (production HTTPS; override with `--dart-define=API_BASE_URL=...` for a local API).

## Features (high level)

- **Auth:** `POST /auth/register`, `POST /auth/login`, JWT refresh.  
- **Stripe:** `POST /create-checkout-session` (authenticated).  
- **Fulfillment:** airtime via configured provider (e.g. Reloadly or mock); see `src/domain/delivery/`.  
- **Trust / receipts:** customer-safe order payloads — `docs/TRUST_API_CONTRACT.md` (transactions API).  
- **Primary E2E purchase flow (doc):** `docs/E2E_PHASE1_CHECKOUT_TO_DELIVERY.md` (Stripe → webhook → fulfillment).  
- **Legacy placeholder:** `src/providers/dtone.placeholder.js` — not the primary integration path.
