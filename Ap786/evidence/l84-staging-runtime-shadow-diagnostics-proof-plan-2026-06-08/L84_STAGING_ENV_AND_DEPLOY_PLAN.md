# L-84 — Staging env and deploy plan (future execution)

**Not executed in L-84 plan gate.**

## Staging project target (only)

| Field | Value |
|-------|--------|
| Vercel project | **`zora-walat-api-staging`** |
| Staging API base (per L-82 evidence) | `https://zora-walat-api-staging.vercel.app` |

## Forbidden targets

| Target | Rule |
|--------|------|
| `zora-walat-api` (production) | **Must not** receive L-84 env changes |
| `zorawalat.com` / production frontend | **No action** |
| Stripe dashboard / webhooks | **No action** |
| Provider / DB | **No action** |

## Required staging env state (future)

| Variable | Required value | Notes |
|----------|----------------|-------|
| `SHADOW_SAFETY_GATE_STAGING_PROBE_ENABLED` | `true` | L-83A probe gate — **new for L-84** |
| `ZW_API_DEPLOYMENT_TIER` | `staging` | L-83A tier gate — **new for L-84** |
| `OPS_HEALTH_TOKEN` | present (≥16 chars) | Existing ops boundary; value **not** recorded in Ap786 |
| `SHADOW_SAFETY_GATE_WEBHOOK_DIAGNOSTICS_ENABLED` | document state only | L-82 may already be `true` on staging; **independent** of probe; do not change unless operator approves |

## Pre-enablement checks (future operator)

1. Confirm linked Vercel project is **`zora-walat-api-staging`** (not production).
2. Confirm production env list has **no** `SHADOW_SAFETY_GATE_STAGING_PROBE_ENABLED=true`.
3. Confirm production env list has **no** `ZW_API_DEPLOYMENT_TIER=staging`.
4. Record pre-change env snapshot (names only, no secret values).

## Redeploy requirement (future)

After env vars set on **staging only**:

1. Redeploy **`zora-walat-api-staging`** API deployment containing PR #203 (`0e55661`+).
2. Confirm deployment **Ready** before any POST trigger.
3. **Do not** redeploy production.

## Stop conditions

- Staging project ambiguous or wrong project linked
- Any production env mutation detected
- Deploy to production requested or implied
- Env gate variables missing after redeploy

---

*End.*
