# L-85M-R5-R4F — Source diff summary

**Gate UTC:** 2026-06-21

---

## Changed tracked source/test files

| File | Change |
|------|--------|
| `api/ops/db-readonly-proof.mjs` | **+1** top-level import: `registerServerlessRuntime.js` |
| `server/test/rootVercelDbReadonlyProofBridge.test.js` | **+1** static parity test; header note L-85M-R5-R4F |

## Unchanged (explicit)

| Area | Status |
|------|--------|
| Pre-bootstrap guard logic | **Unchanged** |
| R5-R3F error boundary (`catch` → 503 JSON) | **Unchanged** |
| `getExpressHandler` bootstrap sequence after registration | **Unchanged** (except runtime kind now set) |
| Route mapping / rewrites | **Unchanged** |
| Proof service / DB client code | **Unchanged** |

---

*End.*
