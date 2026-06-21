# L-85M-R5-R4A — R5-R4 failure context

**Gate UTC:** 2026-06-21  
**Source evidence:** `Ap786/evidence/L85M-R5-R4/` on `main` @ `bbdf73b`

---

## Observed runtime outcome (prior gate — not re-run here)

| Field | Value |
|-------|--------|
| HTTP status | **503** |
| `Content-Type` | `application/json; charset=utf-8` |
| `X-Matched-Path` | **`/api/ops/db-readonly-proof`** |
| `classification` | **`PROOF_ROUTE_BRIDGE_RUNTIME_EXCEPTION`** |
| `prebootstrap_guard` | **`false`** |
| `proof_route_bridge` | **`true`** |
| `runtime_db_identity_proof` | **`false`** |
| Response `Date` (metadata) | `Sun, 21 Jun 2026 07:58:15 GMT` |

## Delta vs R5-R3

| R5-R3 | R5-R4 |
|-------|-------|
| HTTP **500**, HTML, `X-Matched-Path: /500` | HTTP **503**, JSON, `X-Matched-Path: /api/ops/db-readonly-proof` |
| Unhandled platform error | R5-R3F bridge error boundary **active** |

## Static inference for triage

1. Pre-bootstrap guard **accepted** auth (`prebootstrap_guard: false` in boundary body).
2. Failure occurred inside **`passThrough`** wrapped by R5-R3F `catch` in `api/ops/db-readonly-proof.mjs`.
3. Failure is **not** a controlled `dbReadonlyProofContract` pass/fail body (different classification and field set).
4. Runtime DB user / read-only identity | **NOT PROVEN**.

---

*End.*
