# CI / integration execution (repo-supported)

**Local vs Actions:** see **`docs/CI_VERIFICATION.md`** for what you can prove without GitHub.

## GitHub Actions

Workflow: **`.github/workflows/ci.yml`** (job `server`).

| Step | Purpose |
|------|---------|
| Services | **PostgreSQL 16** (`zw_phase1_test`) + **Redis 7** |
| Env | `CI=true`, `DATABASE_URL` + **`TEST_DATABASE_URL`** (same URL in CI), **`REDIS_URL`** |
| `npm run test:integration:preflight` | Surfaces effective DB / Redis / secret hints (no DB connect) |
| `npm run db:migrate:integration` | `prisma migrate deploy` on **`TEST_DATABASE_URL`** when set, else `DATABASE_URL` |
| `npm run test:ci` | **`npm run test`** then **`npm run test:integration`** |
| `phase1:launch-readiness --strict --require-ci-money-path-certified` | Post-gate after green `test:ci` |

### Required secrets in CI

- **No repo secrets required** for default CI: Stripe chaos preload (`registerChaosWebhookEnv.mjs`) injects **test-only** `STRIPE_WEBHOOK_SECRET` / `STRIPE_SECRET_KEY` when unset.
- Forks/custom pipelines: if webhook chaos fails signature validation, set **`STRIPE_WEBHOOK_SECRET`** to a consistent test value in the workflow env (never production secrets).

## Local / CI-like runner

From **`server/`** with **`TEST_DATABASE_URL`** set to a dedicated migrated Postgres:

```bash
npm run ci:integration-verify
```

This runs **preflight → `db:migrate:integration` → `test:ci`**. Exits **2** if `TEST_DATABASE_URL` is missing.

Equivalent manual steps:

```bash
npm run test:integration:preflight
npm run db:migrate:integration
npm run test:ci
```

Or one step: **`npm run verify:ci-local`** (same three phases; requires DB + env like CI).

## Matrix

See **`docs/INTEGRATION_AND_E2E_TESTS.md`** for suite-by-suite prerequisites (Redis-heavy tests, `AIRTIME_PROVIDER`, etc.).
