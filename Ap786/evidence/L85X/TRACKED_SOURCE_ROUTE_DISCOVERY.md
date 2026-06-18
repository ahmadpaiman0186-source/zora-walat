# L-85X — Tracked source route discovery

**Method:** `git grep` / static read — tracked files only.

---

## Exact route strings found

| Route string | Location |
|--------------|----------|
| `/ops/db-readonly-proof` | `server/lib/prebootstrapDbReadonlyProofGuard.mjs`, `server/api/index.mjs`, tests |
| `/api/admin/ops/db-readonly-proof` | same prebootstrap guard + `server/api/index.mjs` |
| Router path `/db-readonly-proof` | `server/src/routes/ops.routes.js` |

**Not found:** `/api/ops/db-readonly-proof` (no such public path in tracked code).

## Files inspected

| File | Role |
|------|------|
| `vercel.json` | Root Next.js deploy config |
| `server/vercel.json` | Server API catch-all deploy |
| `api/health-ready.mjs` | Root health/ready bridge only |
| `api/webhooks/stripe.mjs` | Root Stripe bridge |
| `api/create-checkout-session.mjs` | Root checkout bridge |
| `server/api/index.mjs` | Serverless entry + prebootstrap slim routes |
| `server/handlers/slimDbReadonlyProofPrebootstrapHandler.mjs` | Pre-bootstrap guard handler |
| `server/lib/prebootstrapDbReadonlyProofGuard.mjs` | Token/readonly URL gate |
| `server/src/routes/ops.routes.js` | `executeDbReadonlyProof` route |
| `server/src/services/dbReadonlyProofService.js` | Proof implementation |
| `server/src/app.js` | Express mount `/ops` + `/api/admin/ops` |
| `server/src/lib/dbReadonlyProofContract.js` | Safe response contract |

## Static reachability summary

| Deploy artifact | `/ops/db-readonly-proof` reachable? |
|-----------------|-------------------------------------|
| **`server/`** (`server/vercel.json` → `api/index.mjs`) | **YES** |
| **Repo root** (`vercel.json` Next.js) | **NO** — not in rewrites; no root bridge |

---

*End.*
