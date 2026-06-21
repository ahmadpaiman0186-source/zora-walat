# L-85M-R5-R3A — R5-R3 failure context

**Gate UTC:** 2026-06-20  
**Source:** `Ap786/evidence/L85M-R5-R3/` on `main`

---

| Field | Value |
|-------|--------|
| Gate | **L-85M-R5-R3** |
| Classification | **`AUTHENTICATED_PROOF_RETRY_FAILED_ROUTE_NOT_MATCHED`** |
| Local token preflight | **YES_SHAPE_OK** |
| Endpoint calls | **1** authorized GET |
| HTTP status | **500** |
| `X-Matched-Path` | **`/500`** |
| Proof JSON | **NOT RETURNED** |
| Runtime DB user | **NOT PROVEN** |

## Contrast with L-85M-R5-R1 (same target URL)

| Field | R5-R1 | R5-R3 |
|-------|-------|-------|
| HTTP status | **401** | **500** |
| `X-Matched-Path` | **`/api/ops/db-readonly-proof`** | **`/500`** |
| Response shape | Prebootstrap JSON blocked | HTML platform error |

---

*End.*
