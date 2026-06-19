# L-85M-R2B — Bridge file changeset

**Gate UTC:** 2026-06-19

---

## New files

### `api/ops/db-readonly-proof.mjs`

| Field | Value |
|-------|-------|
| Methods | **GET** only (405 otherwise) |
| URL rewrite | Sets `req.url` to `/ops/db-readonly-proof` (+ query if present) |
| Handler | `handleSlimDbReadonlyProofPrebootstrapGet` from `server/handlers/slimDbReadonlyProofPrebootstrapHandler.mjs` |
| Pass-through | `getExpressHandler()` → existing Express graph (same contract as `server/api/index.mjs` L116–127) |
| Bootstrap | `server/bootstrap.js` + `createValidatedApp()` via cached `serverless-http` handler |
| Pattern | Mirrors `api/webhooks/stripe.mjs` bootstrap style |

### `api/ops/health.mjs`

| Field | Value |
|-------|-------|
| Methods | **GET** only (405 otherwise) |
| URL rewrite | Sets `req.url` to `/ops/health` (+ query if present) |
| Handler | Cached `getExpressHandler()` → Express ops router at `/ops/health` |
| Server route | `server/src/routes/ops.routes.js` `router.get('/health', ...)` |
| Pattern | Same bootstrap cache as Stripe bridge |

## Unchanged bridge files

| File | Status |
|------|--------|
| `api/webhooks/stripe.mjs` | **Unchanged** |
| `api/health-ready.mjs` | **Unchanged** |
| `api/create-checkout-session.mjs` | **Unchanged** |

## No secret/env access in bridges

Bridge files do not read, print, or expose env values. Token/DB proof evaluation remains in existing server handlers only.

---

*End.*
