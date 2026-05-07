# CI verification — what is provable locally vs on GitHub Actions

## Provable **locally** (no GitHub)

From **`server/`**, with PostgreSQL available for integration:

| Step | Command | Notes |
|------|---------|--------|
| Unit tests | `npm run test` | No DB required for default unit suite. |
| Integration preflight | `npm run test:integration:preflight` | Env summary only; uses `.env` like preload. |
| Migrate integration URL | `npm run db:migrate:integration` | Same URL rule as `TEST_DATABASE_URL` / `DATABASE_URL`. |
| Full local CI mimic | `npm run verify:ci-local` | Runs preflight + migrate + `test:ci`; needs **`TEST_DATABASE_URL`** + DB up. Optional: `npm run ci:release-checks` with the same synthetic env as GitHub (see **Release checks** below). |
| Strict integration runner | `npm run ci:integration-verify` | Same as above; exits **2** if `TEST_DATABASE_URL` unset. |

These prove **application + test** behavior on your machine; they do **not** prove the **Ubuntu + service health** matrix GitHub uses.

## Provable **only on GitHub Actions** (or a matching Linux runner)

| Aspect | Why |
|--------|-----|
| **`ubuntu-latest` + `services:`** postgres + redis | Service containers and health checks differ from local Docker Desktop / bare metal. |
| **Concurrent job isolation** | Fresh VM per run. |
| **`phase1:launch-readiness --strict --require-ci-money-path-certified`** | Expects `PHASE1_CI_MONEY_PATH_CERTIFIED=1` set by the workflow after `test:ci`. |

**This repository cannot execute a real GitHub-hosted workflow from Cursor.** After push/PR, confirm the **Actions** tab: job `server` should show preflight → migrate → `test:ci` → launch-readiness.

## `act` (local GitHub Actions emulator)

- **Partial:** `act` often struggles with **`services`** (postgres/redis sidecars). Treat `act` as optional smoke, not a substitute for Actions.
- If you use `act`, prefer **`act -j server`** after binding ports manually or using `act`’s service limitations from [nektos/act docs](https://github.com/nektos/act).

## Required env in **default** `.github/workflows/ci.yml`

| Variable | Set in workflow? |
|----------|------------------|
| `CI` | `true` |
| `DATABASE_URL` | Yes (postgres service) |
| `TEST_DATABASE_URL` | Yes (same DB as integration preload) |
| `REDIS_URL` | Yes (`redis://localhost:6379/0`) |
| Stripe secrets | **No** — `registerChaosWebhookEnv.mjs` injects test placeholders when unset for the chaos integration file |

Forks that **override** or **clear** Stripe env for webhook tests may need to align with that preload behavior.

## Fail-fast interpretation

- **Preflight** fails only if script throws; mostly informational.
- **`db:migrate:integration`** fails on migration errors (unmigrated schema, wrong URL).
- **`test:ci`** fails on any unit or integration failure — **this is the real gate.**

## Workflow file sanity

The workflow is plain YAML committed at **`.github/workflows/ci.yml`**. Review on branch before merge; there is **no** embedded secret in the default job env.

## Required before release (merge to `main` / production promote)

The GitHub Actions **CI** workflow (`.github/workflows/ci.yml`) is the authoritative gate. A green run must include:

| Stage | Command / step | Purpose |
|--------|----------------|--------|
| Integration DB | `npm run test:integration:preflight` → `npm run db:migrate:integration` | Postgres URL + migrate |
| Unit + integration | `npm run test:ci` | `npm test` + integration suite (single concurrency) |
| Launch readiness | `npm run phase1:launch-readiness -- --strict --require-ci-money-path-certified` | Post-certification strict gate |
| **Release checks** | `npm run ci:release-checks` | In order: `verify:local-pricing`, `proof:stripe-webhook-local`, `proof:reloadly-dry-run`, `proof:reconciliation-local`, `proof:audit-trail-local`, `proof:fraud-controls-local`, `preflight:production` |
| Flutter | `flutter analyze` + `flutter test` | Client static analysis + tests |

**CI env (synthetic only):** the workflow sets `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / JWT secrets to **non-production placeholder strings** (Stripe-shaped `sk_test_…` / `whsec_…`), `PRELAUNCH_LOCKDOWN=true`, and mock airtime/webtopup allowlists so proofs and `preflight:production` **do not** require real Stripe, Reloadly, or operator secrets. Forks must not replace these with live keys in YAML.

**Local parity:** run the same server commands from `server/` with `TEST_DATABASE_URL` + Postgres (see table at top). `preflight:production` evaluates a **production profile** against your current `process.env` after `bootstrap` loads `.env` — it may fail on a dev laptop until lockdown / owner / CORS gates match your intent; in CI it is pinned to pass with the synthetic job env above.
