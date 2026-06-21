# L-85M-R5-R4F — Bridge fail-closed guardrails

**Gate UTC:** 2026-06-21

---

## Preserved behaviors (local tests)

| Guardrail | Verification |
|-----------|--------------|
| Unsupported method → **405 JSON** | Handler test |
| Missing token → **401** pre-bootstrap `BLOCKED` JSON | Handler test |
| Authenticated pass-through throw → **503** sanitized `PROOF_ROUTE_BRIDGE_RUNTIME_EXCEPTION` | Handler test |
| No `err.message` / `err.stack` in bridge source | Static review test |
| No sensitive leak markers in JSON bodies | Handler tests |

## Response envelope fields (unchanged)

`secret_disclosure: false`, `runtime_db_identity_proof: false`, `prebootstrap_guard: false` on bridge runtime exception path.

---

*End.*
