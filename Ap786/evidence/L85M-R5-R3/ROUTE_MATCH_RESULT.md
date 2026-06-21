# L-85M-R5-R3 — Route match result

**Gate UTC:** 2026-06-20

---

| Field | Value |
|-------|--------|
| Intended proof route | `/api/ops/db-readonly-proof` (via `/ops/db-readonly-proof` entry) |
| Observed `X-Matched-Path` | **`/500`** |
| Route matched to proof endpoint | **NO** |
| Classification driver | **`AUTHENTICATED_PROOF_RETRY_FAILED_ROUTE_NOT_MATCHED`** |

## Note

Prior **L-85M-R5-R1** observed **`X-Matched-Path: /api/ops/db-readonly-proof`** with **401** (route structurally reachable). This retry observed platform **`/500`** HTML response — proof handler JSON contract **not** reached.

---

*End.*
