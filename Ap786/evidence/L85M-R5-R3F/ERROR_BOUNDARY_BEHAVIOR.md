# L-85M-R5-R3F — Error boundary behavior

**Gate UTC:** 2026-06-20

---

## Trigger

Unhandled exception thrown during **authenticated pass-through** after pre-bootstrap guard returns `pass_through` (Express bootstrap / serverless handler invocation).

## Response (fail-closed JSON)

| Field | Value |
|-------|--------|
| HTTP status | **503** |
| Content-Type | `application/json; charset=utf-8` |
| `classification` | `PROOF_ROUTE_BRIDGE_RUNTIME_EXCEPTION` |
| `reason` | `proof_route_bridge_runtime_exception` |
| `verdict` | `BLOCKED` |
| `runtime_db_identity_proof` | `false` |
| `readonly_database_url_proof` | `false` |
| `secret_disclosure` | `false` |

## Explicit non-inclusions

- No stack traces
- No exception message text
- No env values
- No DB URLs
- No token or Authorization header values

## Unauthenticated path

Pre-bootstrap blocked responses (`token_missing`, `token_invalid`, `readonly_url_missing`) remain **unchanged** and are **outside** the pass-through catch boundary.

## Not proven by this fix

| Item | Status |
|------|--------|
| Root cause eliminated | **NOT CLAIMED** |
| Proof JSON / PASS on staging | **NOT CLAIMED** |
| Runtime DB identity | **NOT PROVEN** |

---

*End.*
