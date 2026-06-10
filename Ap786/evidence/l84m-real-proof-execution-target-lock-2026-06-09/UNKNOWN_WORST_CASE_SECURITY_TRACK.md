# L-84M — Track A: UNKNOWN_WORST_CASE security closure

**Verdict:** `CORE10-L84M-VERDICT-001: L84M_REAL_PROOF_EXECUTION_TARGET_LOCK_ONLY_NO_OPERATIONAL_ACTION`

**Execution in L-84M:** **NO**

## 1. Key families treated as potentially exposed

Under `UNKNOWN_WORST_CASE`, **all** of the following must be treated as **potentially exposed** until ruled out or rotated with proof:

| Family code (L-84K) | Planning status |
|---------------------|-----------------|
| `STRIPE_LIVE_SECRET_API_KEY` | **Potentially exposed** |
| `STRIPE_TEST_SECRET_API_KEY` | **Potentially exposed** |
| `STRIPE_WEBHOOK_SIGNING_SECRET` | **Potentially exposed** |
| `STRIPE_PUBLISHABLE_KEY` | **Potentially exposed** |
| `OPS_TOKEN_ONLY_NOT_STRIPE` | **Potentially exposed** (L-84G UI slot was `OPS_HEALTH_TOKEN`) |

## 2. Repo env names mapped to families (names only)

| Env variable name | Family | Primary file paths |
|-------------------|--------|-------------------|
| `STRIPE_SECRET_KEY` | Stripe secret API key | `server/src/config/stripeEnv.js`, `server/bootstrap.js` |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret | `server/src/config/env.js`, `server/api/slimStripeWebhookHandler.mjs` |
| `STRIPE_PUBLISHABLE_KEY` | Publishable key (server) | `server/.env.production.example`, `server/src/config/stripeLiveReadinessPreflight.js` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Publishable key (client) | `.env.local.example`, root Next app |
| `OPS_HEALTH_TOKEN` | Ops infra token | `server/src/config/env.js`, `server/src/middleware/opsInfraHealthGate.js` |
| `OPS_INFRA_HEALTH_TOKEN` | Ops token alias | `server/src/middleware/opsInfraHealthGate.js` |
| `ZW_OPS_HEALTH_TOKEN` | Operator-local header only (not Vercel) | L-84B protocol — **never in repo/evidence** |

## 3. Runtime surfaces that consume those env names

| Surface | Vercel project (Ap786 evidence) | Env names consumed |
|---------|--------------------------------|--------------------|
| Staging API | **`zora-walat-api-staging`** | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `OPS_HEALTH_TOKEN` |
| Production API | **`zora-walat-api`** | Same server Stripe + ops names — **not L-84G exposure context** |
| Frontend / Next | Separate frontend project (README) | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| Stripe webhook endpoint (staging) | `zora-walat-api-staging` host | Uses `STRIPE_WEBHOOK_SECRET` at runtime |

## 4. Operator dashboard confirmations (no secrets)

Operator may confirm **boolean/state only** in future authorized gates:

| Confirmation | Allowed evidence |
|----------------|------------------|
| Stripe Dashboard: restricted/secret key **exists** for account | Screenshot with **values redacted** or attestation “key present — value not shown” |
| Stripe Dashboard: webhook signing secret **endpoint exists** | Endpoint URL + event list visible; **signing secret value hidden** |
| Stripe mode (test vs live) for affected keys | Mode label only — **no key material** |
| Vercel env **name** present on target project | `vercel env ls` **name list only** — Encrypted indicator OK |
| Whether old key still active vs rolled | “Old key revoked: YES/NO” — **no key strings** |

**Forbidden:** prefix, suffix, partial value, clipboard paste into evidence.

## 5. Rotation / replacement order (outage avoidance)

**Order when execution is authorized in a future gate:**

| Step | Action | Fail-closed rule |
|------|--------|------------------|
| 1 | **Create replacement** in Stripe Dashboard (new secret / webhook secret / publishable as applicable) | Do **not** revoke old key yet |
| 2 | **Update Vercel env** on locked target project(s) — name-only evidence of save | Redeploy **required** before revoke |
| 3 | **Verify** staging runtime (Track C) — checkout/webhook/ops probe as scoped | If verify fails → **STOP**, rollback env to prior, do not revoke |
| 4 | **Revoke old key** in Stripe Dashboard | Only after step 3 pass for that family |
| 5 | **File redacted evidence** | No secret material in Ap786 |

**Cross-family order (worst-case planning):**

1. `STRIPE_WEBHOOK_SECRET` — align before webhook delivery proof
2. `STRIPE_SECRET_KEY` — align before payment API proof
3. `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `STRIPE_PUBLISHABLE_KEY` — frontend deploy after server secret mode confirmed
4. `OPS_HEALTH_TOKEN` — separate Track B; do not mix with Stripe rotation in same unscoped gate

## 6. Rollback / fail-closed rules

| Condition | Action |
|-----------|--------|
| Verify step fails after env update | **STOP** — restore prior env state if safe; do not revoke old key |
| Paste/save fails (L-84G pattern) | **STOP** — discard UI value; file BLOCKED evidence; no retry without new authorization |
| Operator cannot confirm family | Remain `UNKNOWN_WORST_CASE`; no rotation execution |
| Production project touched without explicit production gate | **FORBIDDEN** |

## 7. Evidence to prove rotation OR rotation not required

| Outcome | Required evidence (redacted) |
|---------|------------------------------|
| **Rotation executed** | Gate record: family, target project, env **name** updated, redeploy ID, verify HTTP result, old key revoked attestation — **no values** |
| **Rotation not required (ops-only)** | Operator attestation `OPS_TOKEN_ONLY_NOT_STRIPE` + Track B provision proof — Stripe rotation **not indicated** |
| **Still worst-case** | L-84L attestation stands; Track A planning remains open |

---

*End.*
