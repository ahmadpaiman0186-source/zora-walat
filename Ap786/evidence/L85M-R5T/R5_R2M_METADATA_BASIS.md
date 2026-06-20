# L-85M-R5T — R5-R2M metadata basis

**Gate UTC:** 2026-06-20  
**Source:** committed `Ap786/evidence/L85M-R5-R2M/` on `main` (PR #299)

---

## R5-R2M findings (carried forward)

| Field | R5-R2M result |
|-------|---------------|
| Classification | **`STAGING_ENV_METADATA_ALIGNED_NAMES_PRESENT`** |
| `OPS_HEALTH_TOKEN` on staging | **Present** — `production` scope |
| `READ_ONLY_DATABASE_URL` on staging | **Present** — `production` scope |
| `OPS_INFRA_HEALTH_TOKEN` | **Absent** |
| Token correctness | **NOT PROVEN** |

## R5-R1 / R5-R2 context

| Gate | Outcome |
|------|---------|
| R5-R1 | Auth **401** on both Bearer and `X-ZW-Ops-Token` |
| R5-R2 | Source contract **matches** R5-R1; rejection not header/bridge defect |
| Leading hypothesis | **`TOKEN_VALUE_MISMATCH_LIKELY`** |

## R5-T rationale

Rotate **`OPS_HEALTH_TOKEN`** on **`zora-walat-api-staging`** **`production`** scope only — invalidate prior staging configured value without reading or printing it; enable out-of-band operator alignment before authenticated proof retry.

---

*End.*
