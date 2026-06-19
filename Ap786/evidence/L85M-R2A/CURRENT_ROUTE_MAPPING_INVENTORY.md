# L-85M-R2A — Current route mapping inventory

**Source:** tracked `main` @ `2bbc768`

---

## Root `vercel.json`

| Rewrite source | Destination |
|----------------|-------------|
| `/webhooks/stripe` | `/api/webhooks/stripe` |
| `/health`, `/api/health` | `/api/health-ready?route=health` |
| `/ready`, `/api/ready` | `/api/health-ready?route=ready` |
| `/create-checkout-session` | `/api/create-checkout-session` |

**Absent:** `/ops/*`, `/api/admin/ops/*`

## Root `api/` functions

| File | Public path (with rewrite) |
|------|--------------------------|
| `api/health-ready.mjs` | `/health`, `/ready` |
| `api/webhooks/stripe.mjs` | `/webhooks/stripe` |
| `api/create-checkout-session.mjs` | `/create-checkout-session` |

**Absent:** `api/ops/**`

## `server/vercel.json`

```json
"routes": [{ "src": "/(.*)", "dest": "/api/index.mjs" }]
```

Used only when deploying from `server/` (CLI guard enforces `zora-walat-api` package).

## `server/api/index.mjs` — ops-relevant pre-bootstrap

| Method | Path | Handler |
|--------|------|---------|
| GET | `/ops/db-readonly-proof` | `slimDbReadonlyProofPrebootstrapHandler` |
| GET | `/api/admin/ops/db-readonly-proof` | same |
| POST | `/webhooks/stripe` | `slimStripeWebhookHandler` |

**Note:** `/ops/health` is **not** pre-bootstrap in `server/api/index.mjs`; served via Express `ops.routes.js` after `getHandler()`.

## Express ops mount (`server/src/app.js`)

| Prefix | Router |
|--------|--------|
| `/ops` | `ops.routes.js` |
| `/api/admin/ops` | same router |

## Static verification tooling

| Script | Constraint |
|--------|------------|
| `server/scripts/verify-str02-root-vercel-route.mjs` | Requires `/webhooks/stripe` rewrite; flags **dangerous catch-all** rewrites `/(.*)` |
| `server/scripts/assert-vercel-api-deploy-root.mjs` | Blocks deploy from monorepo root for API project |

---

*End.*
