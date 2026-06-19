# L-85M-R3 — Next gate recommendation

**Gate UTC:** 2026-06-19

---

## Recommended next gate

**L-85M-R4 — structural endpoint proof (read-only HTTP, unauthenticated)**

| Goal | Confirm `/ops/db-readonly-proof` returns **401** (not **404**) after deploy pickup |
| Requires | Separate explicit operator authorization |
| Must not claim | DB identity proof (R5) |

## Later gates (each separately authorized)

| Gate | Purpose |
|------|---------|
| R5 | L-85M authenticated read-only DB identity proof |
| R6 | Webhook runtime proof |

## Unchanged

| Item | Status |
|------|--------|
| PR #5 | **KEEP_OPEN_BLOCKED** |
| L-86E-1 | **DEFERRED** |

## This gate follow-up (separate authorization)

Push evidence branch and open PR — **not performed** in R3.

---

*End.*
