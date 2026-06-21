# L-85M-R5-R3A — Route surface static map

**Gate UTC:** 2026-06-20  
**Source:** tracked files @ `e84f007`

---

## Public entry URL (prior gates)

`https://zora-walat-api-staging.vercel.app/ops/db-readonly-proof`

## Static routing chain

| Step | Owner file | Mapping |
|------|------------|---------|
| 1 | `vercel.json` (repo root) | Rewrite `/ops/db-readonly-proof` → `/api/ops/db-readonly-proof` |
| 2 | Vercel `api/` filesystem | Serverless handler `api/ops/db-readonly-proof.mjs` |
| 3 | Bridge handler | Rewrites internal `req.url` to `/ops/db-readonly-proof` |
| 4 | Pre-bootstrap guard | `server/lib/prebootstrapDbReadonlyProofGuard.mjs` |
| 5 | Pass-through (on auth OK) | `getExpressHandler()` → Express `@ /ops` |
| 6 | Express route | `server/src/routes/ops.routes.js` `GET /db-readonly-proof` |
| 7 | Service | `server/src/services/dbReadonlyProofService.js` `executeDbReadonlyProof` |

## Alternate server-only deployment map (not staging root entry)

| File | Role |
|------|------|
| `server/vercel.json` | Catch-all `/(.*)` → `server/api/index.mjs` |
| `server/api/index.mjs` | Inline pre-bootstrap branch for `/ops/db-readonly-proof` |

Staging API project builds from **repo root** per bridge comments in `api/ops/db-readonly-proof.mjs`.

---

*End.*
