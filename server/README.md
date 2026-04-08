# Zora-Walat API (Node / Express + Prisma)

Entry: **`index.js`** (repo `server/index.js`) loads **`bootstrap.js`** (reads **`server/.env`**, then optional **`server/.env.local`**) then **`src/index.js`**.

## Health and metrics

- **`GET /health`** — liveness JSON `{ "status": "ok" }` (no dependencies).
- **`GET /api/health`** — same contract for clients that only call paths under `/api`.
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

Dev with auto-restart: `npm run dev`

Focused proof (PostgreSQL): `npm run verify:wallet-topup-idempotency` preloads `test/integrations/preloadTestDatabaseUrl.mjs`, which logs **`[zw-integration] Effective DB: …`**. **When `TEST_DATABASE_URL` is set, that URL replaces `DATABASE_URL` for the test process** — it must have **all Prisma migrations** applied. One command for the same URL tests use: **`npm run db:migrate:integration`**. (Plain `npm run db:migrate` uses `DATABASE_URL` from `.env` via bootstrap — if your shell also sets `TEST_DATABASE_URL`, prefer `db:migrate:integration` so you migrate the DB tests actually hit.) Ledger invariant reference: `docs/WALLET_LEDGER_INVARIANT.md`.

HTTP + JWT end-to-end (API must be running): `npm run verify:wallet` — see `docs/WALLET_TOPUP_LOCAL_VERIFY.md`. Authenticated load: `docs/WALLET_TOPUP_LOAD.md` (`npm run load:wallet:replay` / `load:wallet:apply`).

## Environment

- **Template:** `.env.example` (comments describe local vs production).  
- **Secrets:** never commit `.env` / `.env.local`. Optional **`stripe_secret.key`** (single line, gitignored) instead of `STRIPE_SECRET_KEY` in `.env`.  
- **Prisma:** `npm run db:validate` / `npm run db:migrate` — from `server/` so bootstrap loads env (see `.env.example` note). **`npm run db:migrate:integration`** — `migrate deploy` against `TEST_DATABASE_URL` if set, else `DATABASE_URL` (matches integration test preload; does not rely on bootstrap overriding the URL).

## Flutter client

API base URL for local dev defaults in **`lib/core/config/app_config.dart`** (`http://127.0.0.1:8787`). Override: `--dart-define=API_BASE_URL=...`.

## Features (high level)

- **Auth:** `POST /auth/register`, `POST /auth/login`, JWT refresh.  
- **Stripe:** `POST /create-checkout-session` (authenticated).  
- **Fulfillment:** airtime via configured provider (e.g. Reloadly or mock); see `src/domain/delivery/`.  
- **Legacy placeholder:** `src/providers/dtone.placeholder.js` — not the primary integration path.
