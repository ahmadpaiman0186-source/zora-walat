# L-85M-R5-R4A — Bridge pass-through source audit

**Gate UTC:** 2026-06-21

---

## Root bridge file

| Field | Value |
|-------|--------|
| Path | `api/ops/db-readonly-proof.mjs` |
| Vercel rewrite | `vercel.json` L32–34 → `/api/ops/db-readonly-proof` |
| Method gate | GET only → else **405 JSON** |

## Request flow (tracked source)

| Step | Code location | Notes |
|------|---------------|-------|
| 1 | `handler` L70–77 | Method gate |
| 2 | L79–80 | Rewrites `req.url` to `/ops/db-readonly-proof` (+ query) |
| 3 | L82–94 | Dynamic import `slimDbReadonlyProofPrebootstrapHandler.mjs` |
| 4 | Pre-bootstrap | `evaluatePrebootstrapDbReadonlyProof` — **no** `bootstrap.js`, **no** Express |
| 5 | On pass | `passThrough` → `runAuthenticatedPassThrough` |
| 6 | L46–47 | `getExpressHandler()` then `await nextHandler(req, res)` |
| 7 | L88–92 | **`catch`** → `sendProofRouteBridgeRuntimeException` → **503 JSON** |

## `getExpressHandler()` (L56–68)

| Import order | Path |
|--------------|------|
| 1 | `../../server/bootstrap.js` (top-level await: dotenv + Redis rate-limit init) |
| 2 | `../../server/src/index.js` → `createValidatedApp` |
| 3 | `serverless-http` (bare specifier) |
| 4 | `serverless(createValidatedApp(), { callbackWaitsForEmptyEventLoop: false })` |

## Comparison: `server/api/index.mjs` (reference entry)

| Field | Root bridge | `server/api/index.mjs` |
|-------|-------------|------------------------|
| `registerServerlessRuntime.js` before bootstrap | **NO** | **YES** (L6) |
| Pre-bootstrap proof branch | Same slim handler | Same slim handler (L116–128) |
| Pass-through | `getExpressHandler()` + `nextHandler` | `getHandler()` + `nextHandler` |
| Error boundary on pass-through | **YES** (R5-R3F) | **NO** top-level boundary on pass-through |

## Why pre-bootstrap 401 still works while pass-through throws

Pre-bootstrap path imports only:

- `server/lib/prebootstrapDbReadonlyProofGuard.mjs`
- `server/handlers/slimDbReadonlyProofPrebootstrapHandler.mjs`

It reads **`process.env.OPS_HEALTH_TOKEN`** / **`READ_ONLY_DATABASE_URL`** directly and never loads `bootstrap.js`, `createValidatedApp()`, or the Express import graph.

Authenticated pass-through **always** enters the heavy cold path above.

---

*End.*
