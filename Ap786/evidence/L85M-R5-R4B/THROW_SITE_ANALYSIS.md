# L-85M-R5-R4B — Throw site analysis

**Gate UTC:** 2026-06-21

---

## Throw site identified from logs?

**NO**

| Candidate phase (R5-R4A static) | Log corroboration |
|---------------------------------|-------------------|
| Pre-bootstrap guard | **NONE** — would not expect throw logs separate from pass-through |
| `getExpressHandler()` / `bootstrap.js` import | **INCONCLUSIVE** |
| `createValidatedApp()` / Express import graph | **INCONCLUSIVE** |
| `serverless-http` dispatch | **INCONCLUSIVE** |
| `executeDbReadonlyProof` controlled handler | **INCONCLUSIVE** — R5-R4 response was bridge envelope, not proof contract |

## Static throw-site ranking (unchanged — not log-proven)

| Rank | Site | Log delta this gate |
|------|------|---------------------|
| 1 | Authenticated pass-through cold path | **No new evidence** |
| 2 | `registerServerlessRuntime` parity gap | **No refutation** |
| 3 | Owner Prisma / route import graph during `createApp()` | **No new evidence** |

Exact stack frame | **NOT IDENTIFIED**.

---

*End.*
