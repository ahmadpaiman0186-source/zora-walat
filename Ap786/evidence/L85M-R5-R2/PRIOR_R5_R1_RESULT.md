# L-85M-R5-R2 — Prior R5-R1 result

**Gate UTC:** 2026-06-20  
**Source:** committed `Ap786/evidence/L85M-R5-R1/` on `main` (PR #297)

---

## Observed safe outcomes (R5-R1)

| Field | Value |
|-------|--------|
| Target | `https://zora-walat-api-staging.vercel.app/ops/db-readonly-proof` |
| `X-Matched-Path` | `/api/ops/db-readonly-proof` |
| Bearer variant | **401 Unauthorized** |
| `X-ZW-Ops-Token` variant | **401 Unauthorized** |
| Runtime DB user | **NOT PROVEN** |
| Runtime DB query | **NOT PROVEN** |
| L-85M PASS | **NOT CLAIMED** |
| Classification | **`L-85M-R5-R1_AUTH_REJECTED_NOT_PASS`** |

## R5-R1 auth variants used

| Variant | Used |
|---------|------|
| `Authorization: Bearer` | **YES** |
| `X-ZW-Ops-Token` | **YES** |
| `x-ops-health-token` | **NO** |

## R5-R1 explicit non-conclusions (carried forward)

- Staging vs local `OPS_HEALTH_TOKEN` alignment — **NOT ESTABLISHED**
- Staging env missing/truncated/rotated — **NOT ESTABLISHED**
- Response `reason` field (`token_missing` vs `token_invalid`) — **NOT FILED** in R5-R1 evidence

---

*End.*
