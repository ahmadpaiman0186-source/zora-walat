# L-85M-R5-R3F — Validation results

**Gate UTC:** 2026-06-20

---

## Commands run

| Command | Result |
|---------|--------|
| `git diff --check` | **PASS** |
| `npm --prefix server run secrets:scan` | **OK** |
| `node --import ./test/setupTestEnv.mjs --test --test-concurrency=1 test/rootVercelDbReadonlyProofBridge.test.js` | **4/4 pass** |

## Test coverage

| Case | Result |
|------|--------|
| Static: error boundary + classification present | **PASS** |
| Unsupported method → 405 JSON | **PASS** |
| Unauthenticated → 401 prebootstrap BLOCKED JSON preserved | **PASS** |
| Authenticated pass-through throw → 503 sanitized JSON | **PASS** |

## Not run

| Item | Reason |
|------|--------|
| Full `npm test` suite | Gate scoped to relevant bridge tests only |
| Live staging endpoint | **Not authorized** |

---

*End.*
