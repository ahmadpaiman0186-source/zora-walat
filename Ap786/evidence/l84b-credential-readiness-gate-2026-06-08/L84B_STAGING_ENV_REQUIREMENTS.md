# L-84B — Staging env requirements (future)

**Not executed in L-84B gate.** Names only — **no values**.

## Target project (only)

| Field | Value |
|-------|--------|
| Vercel project | **`zora-walat-api-staging`** |
| Staging API base | `https://zora-walat-api-staging.vercel.app` |
| Vercel env slot | Production label on staging project (primary deployment — **not** prod API project) |

## Forbidden targets

| Target | Rule |
|--------|------|
| `zora-walat-api` | **Must not** receive L-84B/L-84 retry env changes |
| `zorawalat.com` | **No action** |
| Stripe / webhooks | **No action** |
| Provider / DB | **No action** |

## Required env (future retry window)

| Variable | Required state | Notes |
|----------|----------------|-------|
| `OPS_HEALTH_TOKEN` | **Present** (≥16 chars) | Auth for probe route; value **never** in Ap786 |
| `SHADOW_SAFETY_GATE_STAGING_PROBE_ENABLED` | `true` during probe only | L-83A probe gate |
| `ZW_API_DEPLOYMENT_TIER` | `staging` | L-83A tier gate |
| `SHADOW_SAFETY_GATE_WEBHOOK_DIAGNOSTICS_ENABLED` | Document only | L-82 may already be `true`; independent of probe |

## Pre-enablement checks (future operator)

1. Confirm Vercel project name is exactly **`zora-walat-api-staging`**.
2. Confirm production project **`zora-walat-api`** has **no** probe flags or staging tier mis-set.
3. Record env snapshot (**names only**) before changes.
4. Redeploy staging API after env confirmation (future L-84 retry step).

## L-84B gate scope

Documents requirements only. **Does not inspect or modify live env.**

---

*End.*
