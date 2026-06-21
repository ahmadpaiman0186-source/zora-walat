# L-85M-R5-R4F — Fix scope

**Gate UTC:** 2026-06-21

---

## In scope

| Item | Action |
|------|--------|
| `api/ops/db-readonly-proof.mjs` | Import `registerServerlessRuntime.js` before authenticated pass-through bootstrap (parity with `server/api/index.mjs`) |
| `server/test/rootVercelDbReadonlyProofBridge.test.js` | Add static parity assertion; retain fail-closed handler tests |

## Out of scope

| Item | Status |
|------|--------|
| Slim pass-through / partial Express graph | **NOT DONE** |
| Bridge error logging expansion | **NOT DONE** |
| Env / Vercel settings | **NOT MUTATED** |
| Deploy / redeploy | **NOT PERFORMED** |
| Authenticated proof retry | **NOT PERFORMED** |
| Payment / provider / webhook | **NOT MUTATED** |

---

*End.*
