# L-85M-R5-R2M — Env scope alignment review

**Gate UTC:** 2026-06-20

---

## Observed Vercel scope binding

| Env name | `target` scopes |
|----------|-----------------|
| `OPS_HEALTH_TOKEN` | **`production` only** |
| `READ_ONLY_DATABASE_URL` | **`production` only** |
| `OPS_INFRA_HEALTH_TOKEN` | **not configured** |

## Staging deployment slot alignment

| Item | Assessment |
|------|------------|
| L-85M host | `zora-walat-api-staging.vercel.app` |
| Vercel project | **`zora-walat-api-staging`** (dedicated staging API project) |
| Required env vars on **`production`** scope | **YES** — both primary names |
| Preview/development scopes | **Empty** for required names |

Dedicated staging API projects commonly deploy from the Vercel **Production** environment slot. Required names bound to **`production`** on **`zora-walat-api-staging`** are **consistent** with expected staging runtime binding.

## Classification

| Hypothesis | Result |
|------------|--------|
| **`STAGING_ENV_SCOPE_MISMATCH_LIKELY`** | **NOT INDICATED** by metadata |

Scope mismatch between preview-only vars and production deployment **not** observed for required names.

---

*End.*
