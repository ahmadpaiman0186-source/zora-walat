# L-84V — Env name dependency map

**Verdict:** `CORE10-L84V-VERDICT-001: L84V_PAYMENT_DEPENDENCY_MAP_COMPLETED_READ_ONLY_EXECUTION_STILL_BLOCKED`

**Names only — no values.** Cross-ref [L-84J inventory](../l84j-stripe-key-rotation-preflight-target-lock-2026-06-09/L84J_REPO_STRIPE_ENV_VARIABLE_INVENTORY.md).

## Primary server runtime (payment-critical)

| Env variable | Key family (name-level) | Consumed by | Rotation couples with |
|--------------|-------------------------|-------------|------------------------|
| **`STRIPE_SECRET_KEY`** | `sk_*` / `rk_*` (test or live) | Stripe SDK, checkout, API calls, fallback poller | Must update Vercel + any local `.env` on same deployment |
| **`STRIPE_WEBHOOK_SECRET`** | `whsec_*` | `constructEvent` on **`POST /webhooks/stripe`** | Stripe Dashboard webhook endpoint secret + Vercel value must match |

## Secondary / optional server

| Env variable | Role |
|--------------|------|
| **`STRIPE_PUBLISHABLE_KEY`** | Optional server-side alignment (`stripeLiveReadinessPreflight.js`) |
| **`STRIPE_SECRET_KEY_INTEGRATION`** | Integration tests only |

## Frontend / client

| Env variable | Role |
|--------------|------|
| **`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`** | Client checkout UI (`pk_*` family) — separate Vercel project likely |

## Ops infra (NOT Stripe — L-84R/L-84S incident field)

| Env variable | Role | Stripe rotation? |
|--------------|------|------------------|
| **`OPS_HEALTH_TOKEN`** | Ops/infra auth (`/ops/health`, `/ready`) | **NO** — separate recovery track |
| **`OPS_INFRA_HEALTH_TOKEN`** | Documented alias | **NO** |

## Mode / guard flags (names only — affect live vs test behavior)

| Env variable | Role |
|--------------|------|
| `ALLOW_STRIPE_TEST_KEYS_IN_PRODUCTION` | Supervised staging with test keys |
| `ZW_STRIPE_LIVE_READINESS_ACK_LIVE_SECRET` | Live key guard in non-prod |
| `ZW_STRIPE_LIVE_PREFLIGHT_PROD_INTENT` | Preflight prod intent |
| `PAYMENTS_LOCKDOWN_MODE` / `PRELAUNCH_LOCKDOWN` | Money path lockdown |

## Unknown in L-84V (requires future gate with Vercel read-only name inventory)

| Question | Status |
|----------|--------|
| Which Vercel project holds live **`STRIPE_SECRET_KEY`** | **UNKNOWN** |
| Staging vs production share same Stripe account keys | **UNKNOWN** |
| Whether **`OPS_HEALTH_TOKEN`** deployed value is Stripe key | **NOT PROVEN** (UI observation only) |

---

*End.*
