# L-85M-R5-R4B — R5-R4A correlation

**Gate UTC:** 2026-06-21

---

## R5-R4A static hypothesis (on `main`)

Authenticated pass-through cold path failure:

`getExpressHandler()` → `bootstrap.js` → `createValidatedApp()` → Express import graph / `serverless-http` dispatch.

Documented parity gap: root bridge **`api/ops/db-readonly-proof.mjs`** omits **`registerServerlessRuntime.js`** imported first by **`server/api/index.mjs`**.

## Log triage vs static hypothesis

| Hypothesis branch | Log support | Log refutation |
|-------------------|-------------|----------------|
| Pass-through cold-path throw | **INCONCLUSIVE** | **NONE** |
| Missing `registerServerlessRuntime` trigger | **INCONCLUSIVE** | **NONE** |
| Missing route / rewrite failure | **N/A** | **NONE** (static already ruled out) |
| Proof handler DB probe failure | **INCONCLUSIVE** | **NONE** — R5-R4 bridge classification differs from proof contract JSON |

## Interpretation

Insufficient Vercel log lines **neither confirm nor disprove** R5-R4A phase narrowing. Static hypothesis **remains the leading engineering story** pending either:

- operator UI log export with sanitized excerpts, or
- authorized bounded code fix (R5-R4F) plus optional sanitized bridge logging.

---

*End.*
