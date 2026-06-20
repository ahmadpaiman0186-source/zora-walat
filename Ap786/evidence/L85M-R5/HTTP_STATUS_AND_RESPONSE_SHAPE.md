# L-85M-R5 — HTTP status and response shape

**Gate UTC:** 2026-06-20

---

## Authenticated response

| Field | Value |
|-------|--------|
| HTTP status | **NOT OBSERVED** (request blocked) |
| Response body | **NOT OBSERVED** |
| `X-Matched-Path` | **NOT OBSERVED** |

## Prior R4 unauthenticated baseline (context only)

| Field | Value |
|-------|--------|
| Unauthenticated status | 401 |
| Reason | `token_missing` |

R5 requires authenticated 200 + proof fields — **not attempted** in this gate run.

---

*End.*
