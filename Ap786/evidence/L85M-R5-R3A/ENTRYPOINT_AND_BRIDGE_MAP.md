# L-85M-R5-R3A — Entrypoint and bridge map

**Gate UTC:** 2026-06-20

---

## Staging API entrypoint (root deployment)

| Field | Value |
|-------|--------|
| Primary config | `vercel.json` (repo root) |
| Framework metadata | `nextjs` (root package) |
| Proof bridge file | **`api/ops/db-readonly-proof.mjs`** |
| Related bridge | `api/ops/health.mjs` (same Express bootstrap pattern) |

## Bridge behavior (`api/ops/db-readonly-proof.mjs`)

| Step | Action |
|------|--------|
| Method gate | GET only; else **405 JSON** |
| URL shim | Sets `req.url` to `/ops/db-readonly-proof` |
| Pre-bootstrap | `handleSlimDbReadonlyProofPrebootstrapGet` |
| On pass | `getExpressHandler()` imports `server/bootstrap.js` + `createValidatedApp()` + `serverless-http` |
| Error boundary | **No top-level try/catch** around pass-through await |

## Server catch-all entry (reference only)

| Field | Value |
|-------|--------|
| File | `server/api/index.mjs` |
| Pattern | Same pre-bootstrap + pass-through for `/ops/db-readonly-proof` when deployed via `server/vercel.json` |

---

*End.*
