# L-85M-R2B — Next gate recommendation

**Gate UTC:** 2026-06-19

---

## Recommended sequence (each requires separate authorization)

| Gate | Purpose | Deploy | Endpoints | DB proof |
|------|---------|--------|-----------|----------|
| **R3** | Deployment pickup proof | **YES** | No | No |
| **R4** | Structural endpoint proof (401 not 404 on `/ops/db-readonly-proof`) | After R3 | **YES** (unauthenticated structural) | No |
| **R5** | L-85M authenticated read-only DB proof | After R4 | **YES** (authorized) | **YES** |
| **R6** | Webhook runtime proof | Separate | **YES** | No |

## Immediate next gate

**L-85M-R3 — deployment pickup proof**

Requires operator authorization for deploy only. No L-85M proof in R3.

## Unchanged disposition

| Item | Status |
|------|--------|
| PR #5 | **KEEP_OPEN_BLOCKED** |
| L-86E-1 | **DEFERRED** |

## Push / PR for R2B

Evidence + route mutation committed locally. Push and PR open require **separate operator authorization** (not performed in R2B).

---

*End.*
