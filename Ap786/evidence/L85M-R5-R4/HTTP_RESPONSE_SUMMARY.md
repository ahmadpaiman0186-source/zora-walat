# L-85M-R5-R4 — HTTP response summary

**Gate UTC:** 2026-06-21

---

| Field | Value |
|-------|--------|
| HTTP status | **503** |
| `Content-Type` | `application/json; charset=utf-8` |
| `X-Matched-Path` | **`/api/ops/db-readonly-proof`** |
| `Date` | `Sun, 21 Jun 2026 07:58:15 GMT` |
| Body length (bytes) | **480** |
| HTML body | **NO** |
| JSON parse | **OK** |

## Safe JSON fields observed

| Field | Value |
|-------|--------|
| `ok` | `false` |
| `success` | `false` |
| `verdict` | `BLOCKED` |
| `classification` | **`PROOF_ROUTE_BRIDGE_RUNTIME_EXCEPTION`** |
| `reason` | `proof_route_bridge_runtime_exception` |
| `route` | `/ops/db-readonly-proof` |
| `prebootstrap_guard` | `false` |
| `proof_route_bridge` | `true` |
| `secret_disclosure` | `false` |

Raw body not filed. No stack trace observed in allowlisted fields.

---

*End.*
