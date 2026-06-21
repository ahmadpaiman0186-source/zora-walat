# L-85M-R5T-R2D — Deployment pickup metadata

**Gate UTC:** 2026-06-20  
**Target:** **`zora-walat-api-staging`** (`prj_cEfwYIsWRcJ4BLz5bcCwc8A5jCeY`)

---

## Required field

**`POST_ALIGNMENT_DEPLOYMENT_PICKUP_METADATA_OBSERVED=YES`**

## Classification

**`POST_ALIGNMENT_DEPLOYMENT_PICKUP_METADATA_OBSERVED`**

## R5T-R2 alignment anchor (prior gate, metadata only)

| Field | Value |
|-------|--------|
| Source | `Ap786/evidence/L85M-R5T-R2/VERCEL_ENV_ALIGNMENT_ACTION.md` on `main` |
| `OPS_HEALTH_TOKEN` env `updatedAt` (ms) | `1782004198954` |
| Manual redeploy in R5T-R2 | **NOT PERFORMED** |

## Post-alignment Vercel deployments (read-only `vercel list`, metadata only)

Deployments with `createdAt` ≥ alignment anchor:

| # | `state` | `target` | `createdAt` (ms) | `ready` (ms) | Host suffix (redacted prefix) |
|---|---------|----------|------------------|--------------|-------------------------------|
| 1 | **READY** | `null` | `1782004593685` | `1782004869054` | `…-76er0418x.vercel.app` |
| 2 | **READY** | `production` | `1782005295986` | `1782005454156` | `…-bak1u15a1.vercel.app` |

Latest **production**-target deployment after alignment anchor: **`READY`** at `1782005295986`.

## Interpretation (metadata only)

Platform automation **observed** at least one **READY** deployment on **`zora-walat-api-staging`** with `createdAt` **after** the R5T-R2 `OPS_HEALTH_TOKEN` env `updatedAt` metadata anchor.

## Not concluded

| Item | Status |
|------|--------|
| Active runtime bound to aligned token value | **NOT PROVEN** |
| Authenticated `/ops/db-readonly-proof` acceptance | **NOT PROVEN** |
| L-85M PASS | **NOT CLAIMED** |

---

*End.*
