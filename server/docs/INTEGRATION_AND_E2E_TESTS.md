# Integration & E2E-style verification — preconditions

## CI (GitHub Actions)

See **`docs/CI_INTEGRATION.md`** for the workflow, `TEST_DATABASE_URL`, `db:migrate:integration`, and `test:ci`.

## Quick preflight

From `server/`:

```bash
npm run test:integration:preflight
```

Then migrate the effective DB if needed:

```bash
npm run db:migrate:integration
```

## Effective database URL

Integration preload (`test/integrations/preloadTestDatabaseUrl.mjs`) applies:

- If **`TEST_DATABASE_URL`** is non-empty → it becomes **`DATABASE_URL`** for the test process (must be **fully migrated**).
- Else → use **`DATABASE_URL`** from `server/.env` / `server/.env.local`.

Stderr shows: **`[zw-integration] Effective DB: …`**

## Suite inventory

| Command / suite | PostgreSQL | `TEST_DATABASE_URL` | Migrations | Redis | Stripe / secrets |
|-----------------|------------|---------------------|------------|-------|------------------|
| `npm run test` (unit) | No | No | No | No | No |
| `npm run verify:wallet-topup-idempotency` | Yes | Optional override | **Required** on effective URL | No | No |
| `npm run test:integration` (first batch) | Yes | CI / some suites | **Required** | No* | Optional** |
| `test/integrations/stripeWebhookHttpChaos.integration.test.js` (second batch) | Yes | CI | **Required** | **Often required** for chaos harness | Webhook secret in env |

\*Unless a test explicitly exercises Redis; fortress / money-path tests may use Redis if configured.  
\** Phase 1 paths may need Stripe-related env for full realism; many tests use fixtures/mocks.

## CI suggestion

- Set **`TEST_DATABASE_URL`** to a dedicated Postgres.
- Run **`npm run db:migrate:integration`** (or equivalent `migrate deploy` against that URL) before **`npm run test:integration`**.
- Set **`CI=true`** where tests enforce `TEST_DATABASE_URL` presence (wallet idempotency, Phase 1 money path, etc.).

## Friction reducers (scripts)

- **`npm run db:migrate:integration`** — `prisma migrate deploy` against the **same** URL integration tests use (avoids bootstrap/env override pitfalls; see `scripts/migrate-integration-database.mjs`).

## In-process Express (`createApp()` without `bootstrap.js`)

Some integration files import **`createApp()`** directly (e.g. Stripe webhook chaos). They **do not** load `server/bootstrap.js`, so:

- `server/.env` may not apply unless CI injects vars.
- **`RATE_LIMIT_USE_REDIS`** does not apply: limiters use **in-memory** buckets for that process (acceptable for single-instance test servers).

## E2E purchase narrative (doc only)

Stripe Checkout → webhook → fulfillment is described in **`docs/E2E_PHASE1_CHECKOUT_TO_DELIVERY.md`**. Automated proof is primarily **integration tests** + operator scripts, not a single magic “E2E” npm script for all clouds.
