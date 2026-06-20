# L-85M-R5-R2M — Env name presence matrix

**Gate UTC:** 2026-06-20  
**Target project:** **`zora-walat-api-staging`** (`prj_cEfwYIsWRcJ4BLz5bcCwc8A5jCeY`)
**Method:** `vercel env list <scope> --format json` — metadata only; stderr suppressed; **no values**

---

## Metadata retrieval status

| Method | Result |
|--------|--------|
| `vercel project inspect zora-walat-api-staging` | **COMPLETED** |
| `vercel env list` scoped via `VERCEL_PROJECT_ID` | **COMPLETED** |

---

## Required env names — presence matrix

| Env name | Present | Vercel scope(s) listed | `target` array | Type | Length metadata |
|----------|---------|------------------------|----------------|------|-----------------|
| `OPS_HEALTH_TOKEN` | **YES** | `production` | `["production"]` | `sensitive` | **LENGTH_NOT_AVAILABLE_METADATA_ONLY** |
| `OPS_INFRA_HEALTH_TOKEN` | **NO** | — | — | — | **LENGTH_NOT_AVAILABLE_METADATA_ONLY** |
| `READ_ONLY_DATABASE_URL` | **YES** | `production` | `["production"]` | `sensitive` | **LENGTH_NOT_AVAILABLE_METADATA_ONLY** |

### Preview / development scopes

All three names **absent** from `preview` and `development` listings (expected for staging API project using Production slot).

---

## Classification

**`STAGING_ENV_METADATA_ALIGNED_NAMES_PRESENT`**

Primary auth env name and readonly URL name are **both present** on the **`production`** scope for the staging API project. Alias `OPS_INFRA_HEALTH_TOKEN` absent but **not required** when primary is configured (tracked source accepts either).

---

*End.*
