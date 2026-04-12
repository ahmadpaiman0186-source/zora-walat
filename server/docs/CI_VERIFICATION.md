# CI verification — what is provable locally vs on GitHub Actions

## Provable **locally** (no GitHub)

From **`server/`**, with PostgreSQL available for integration:

| Step | Command | Notes |
|------|---------|--------|
| Unit tests | `npm run test` | No DB required for default unit suite. |
| Integration preflight | `npm run test:integration:preflight` | Env summary only; uses `.env` like preload. |
| Migrate integration URL | `npm run db:migrate:integration` | Same URL rule as `TEST_DATABASE_URL` / `DATABASE_URL`. |
| Full local CI mimic | `npm run verify:ci-local` | Runs preflight + migrate + `test:ci`; needs **`TEST_DATABASE_URL`** + DB up. |
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
