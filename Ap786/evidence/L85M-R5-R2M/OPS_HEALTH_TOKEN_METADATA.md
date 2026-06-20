# L-85M-R5-R2M — OPS_HEALTH_TOKEN metadata

**Gate UTC:** 2026-06-20  
**Target project:** **`zora-walat-api-staging`**

---

| Field | Value |
|-------|--------|
| Name | `OPS_HEALTH_TOKEN` |
| Present | **YES** |
| Vercel list scope queried | `production` |
| `target` | `["production"]` |
| Type | `sensitive` |
| `createdAt` (ms, CLI metadata) | `1781054785632` |
| `updatedAt` (ms, CLI metadata) | `1781054785632` |
| Value accessed | **NO** |
| Length metadata | **LENGTH_NOT_AVAILABLE_METADATA_ONLY** |
| Length ≥16 chars | **NOT CLAIMED** (value not read) |
| Token correctness vs operator Process token | **NOT CLAIMED** |

## R5-R1 relevance

Name **present** on staging project — auth **401** in R5-R1 is **not** explained by **missing env name** alone. **`TOKEN_VALUE_MISMATCH_LIKELY`** remains open (R5-R2 hypothesis).

---

*End.*
