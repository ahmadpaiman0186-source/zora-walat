# L-85M-R5-R4B — Runtime exception log findings

**Gate UTC:** 2026-06-21

---

## Required questions

| Question | Answer |
|----------|--------|
| Logs accessible (CLI session)? | **YES** |
| Sanitized runtime exception log lines for target window? | **NO** |
| Exception class identified? | **NO** |
| Stack trace / error name observed? | **NO** |
| `/ops/db-readonly-proof` or `/api/ops/db-readonly-proof` request log? | **NOT OBSERVED** in retrieved set |
| HTTP **503** log entry in window? | **NOT OBSERVED** in retrieved set |
| `PROOF_ROUTE_BRIDGE_RUNTIME_EXCEPTION` in logs? | **NOT OBSERVED** |

## Known runtime outcome (from R5-R4 — not re-run)

| Field | Value |
|-------|--------|
| HTTP status | **503** |
| Bridge classification | **`PROOF_ROUTE_BRIDGE_RUNTIME_EXCEPTION`** |
| `X-Matched-Path` | **`/api/ops/db-readonly-proof`** |

## Gate conclusion

CLI log retrieval for the R5-R4 anchored window returned **no usable function/request log lines** identifying exception class or throw site. Outcome parallels **R5-R3B** (`R5_R3B_LOGS_UNAVAILABLE_OR_INSUFFICIENT`) but uses the **R5-R4** timestamp anchor and **`jeku6t6ta` / `dpl_E1qVq7vcY22e7tU71hGwbjb7N3wD`** deployment correlation.

---

*End.*
