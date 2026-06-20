# L-85M-R5 — Next gate recommendation

**Gate UTC:** 2026-06-20

---

## Immediate blocker

**`R5_BLOCKED_TOKEN_NOT_AVAILABLE`**

Operator must set `OPS_HEALTH_TOKEN` in the **agent Process environment** (or re-run gate in a session where it is already set) **without** pasting the token into chat or evidence.

## Retry gate (separate authorization)

**L-85M-R5-RETRY** or re-execution of R5 with:

1. Process-scoped `OPS_HEALTH_TOKEN` available
2. Single authenticated GET to `/ops/db-readonly-proof`
3. Allowlisted response fields only

## Auth contract for retry

`Authorization: Bearer <OPS_HEALTH_TOKEN>` (tracked source confirmed)

## Unchanged

| Item | Status |
|------|--------|
| PR #5 | **KEEP_OPEN_BLOCKED** |
| L-85M structural layer (R4) | **PASS** (401 not 404) |

---

*End.*
