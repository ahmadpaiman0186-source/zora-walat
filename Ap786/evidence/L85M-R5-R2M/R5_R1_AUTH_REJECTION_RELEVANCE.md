# L-85M-R5-R2M — R5-R1 auth rejection relevance

**Gate UTC:** 2026-06-20  
**Source:** committed `Ap786/evidence/L85M-R5-R1/` (PR #297)

---

## R5-R1 observed safe outcomes

| Field | Value |
|-------|--------|
| Bearer variant | **401 Unauthorized** |
| `X-ZW-Ops-Token` variant | **401 Unauthorized** |
| `X-Matched-Path` | `/api/ops/db-readonly-proof` |
| Runtime DB user | **NOT PROVEN** |
| Classification | **`L-85M-R5-R1_AUTH_REJECTED_NOT_PASS`** |

## Relevance to R5-R2M metadata check

| Question | R5-R2M status |
|----------|---------------|
| Was auth rejected despite route exposure? | **YES** (prior gate) |
| Does rejection prove missing staging env names? | **NO** — requires metadata |
| Does rejection prove token value mismatch? | **NO** — requires metadata / out-of-band alignment |
| Response `reason` (`token_missing` vs `token_invalid`) filed? | **NO** in R5-R1 |

R5-R2M observed staging env **name presence/scope**. Required names **`OPS_HEALTH_TOKEN`** and **`READ_ONLY_DATABASE_URL`** are **present** on staging project **`production`** scope — R5-R1 **401** is **not** explained by missing env **names** alone; **token value misalignment** remains the leading open hypothesis.

---

*End.*
