# L-85M-R5-R3F — Fix scope

**Gate UTC:** 2026-06-20

---

## Objective

Add a **narrow fail-closed sanitized error boundary** around the **authenticated pass-through** section of the root proof-route bridge so runtime exceptions do not collapse into generic platform `/500` HTML without safe JSON classification.

## In scope

| Item | Detail |
|------|--------|
| Target file | `api/ops/db-readonly-proof.mjs` |
| Change type | `try/catch` around authenticated pass-through only |
| Response | Sanitized JSON with `classification: PROOF_ROUTE_BRIDGE_RUNTIME_EXCEPTION` |
| Auth semantics | **Preserved** — pre-bootstrap guard unchanged |
| Route mapping | **Unchanged** — root `vercel.json` rewrite untouched |

## Out of scope

| Item | Status |
|------|--------|
| Express proof service logic | **NOT CHANGED** |
| Pre-bootstrap guard | **NOT CHANGED** |
| Payment/webhook/provider | **NOT CHANGED** |
| Env / deploy / redeploy | **NOT PERFORMED** |
| Endpoint retry / runtime DB proof | **NOT PERFORMED** |

---

*End.*
