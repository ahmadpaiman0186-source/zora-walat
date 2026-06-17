# L-85I — Environment key usage audit

**Method:** Tracked-file grep and static read of `server/src/config/env.js`, `server/src/db.js`, bootstrap, handlers, routes. **No env values read. No `.env.local` access.**

---

## 1) `READ_ONLY_DATABASE_URL`

| Location class | Referenced? | Consumed at runtime? |
|----------------|-------------|----------------------|
| `server/src/**`, `server/handlers/**`, `server/api/**`, root `api/**` | **NO** | **NO** |
| Ap786 evidence (L-85D–H) | **YES** (documentation / local probe gates) | N/A |

**Verdict:** **NO** runtime consumption in tracked application code.

---

## 2) `DATABASE_URL`

| Consumer (tracked) | Usage |
|--------------------|-------|
| `server/src/db.js` | Prisma datasource URL (`buildDatabaseUrlWithPoolCap`) |
| `server/src/config/env.js` | `databaseUrl` export |
| `server/src/runtime/serverLifecycle.js` | Startup validation / fatal guards |
| `server/src/config/productionDeploymentPreflight.js` | Production preflight blocker |
| `server/handlers/slimReadyHandler.mjs` | Slim `/ready` imports `db.js` |
| `server/src/routes/ops.routes.js` | `/ops/health` via shared `prisma` |
| `server/src/routes/health.routes.js` | Full `/ready` via shared `prisma` |
| Scripts / tests / tools under `server/scripts`, `server/tools`, `server/test` | Operator proofs, integration tests (not deployed runtime) |

**Read-only alternate path:** **None** in runtime — single owner connection.

---

## 3) `OPS_HEALTH_TOKEN` (alias: `OPS_INFRA_HEALTH_TOKEN`)

| Consumer (tracked) | Usage |
|--------------------|-------|
| `server/src/config/env.js` | `opsInfraHealthToken` |
| `server/src/middleware/opsInfraHealthGate.js` | Bearer / `X-ZW-Ops-Token` match |
| `server/src/routes/health.routes.js` | Gates `/ready`, `/metrics` under prelaunch |
| `server/src/routes/ops.routes.js` | Gates `/ops/health` under prelaunch |
| `server/src/routes/internalShadowSafetyGateStagingProbe.routes.js` | Staging diagnostic probe |
| `server/src/routes/internalPhase1MissionMetrics.routes.js` | Internal metrics |
| `server/src/routes/internalWebtopupLogs.routes.js` | Internal logs |
| `server/src/runtime/serverLifecycle.js` | Startup warning if short/unset under prelaunch |

**Note:** Token is **auth for infra surfaces**, not DB role selection.

---

## 4) Stripe / payment / provider keys (names only)

Keys referenced in tracked runtime config (`server/src/config/env.js`, `stripeEnv.js`, `health.routes.js`, `bootstrap.js`, payment controllers):

| Env key name | Runtime role (structural) |
|--------------|---------------------------|
| `STRIPE_SECRET_KEY` | Server-side Stripe API |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification |
| `STRIPE_PUBLISHABLE_KEY` | Client publishable key preflight (cross-surface check) |
| `ZW_CONTROLLED_STRIPE_LIVE_PROOF` | Controlled live proof flag |
| `ZW_STRIPE_LIVE_PROOF_MAX_FINAL_USD_CENTS` | Live proof cap |
| `ZW_STRIPE_LIVE_PROOF_ALLOWED_RECIPIENTS` | Live proof allowlist |
| `PRICING_STRIPE_FEE_BPS` | Pricing model input |
| `PRICING_STRIPE_FIXED_CENTS` | Pricing model input |
| `FINANCIAL_TRUTH_STRIPE_FEE_TOLERANCE_CENTS` | Reconciliation tolerance |
| `FINANCIAL_TRUTH_STRIPE_FEE_TOLERANCE_RATIO_BPS` | Reconciliation tolerance |

**L-85I:** No Stripe/provider env mutation authorized. Names listed for inventory only.

---

## 5) Related deployment / tier flags (structural)

| Env key name | Notes |
|--------------|-------|
| `PRELAUNCH_LOCKDOWN` | Enables infra token gates |
| `ZW_API_DEPLOYMENT_TIER` | Staging vs production tier checks (shadow safety probe) |
| `ZW_SHADOW_SAFETY_GATE_STAGING_PROBE_ENABLED` | Staging probe route enable |
| `REDIS_URL` | Redis probe in `/ops/health` (not DB identity) |
| `PRISMA_CONNECTION_LIMIT` | Pool cap on owner URL |

---

## 6) `.env.example` / gitignore posture

| File | Tracked? | L-85I action |
|------|----------|--------------|
| `server/.env.example` | referenced in code comments | not read (may contain example placeholders) |
| `server/.env.production.example` | tracked template | not read for values |
| `server/.gitignore` | ignores `.env*.local` | confirms local secrets out of repo |

---

*End.*
