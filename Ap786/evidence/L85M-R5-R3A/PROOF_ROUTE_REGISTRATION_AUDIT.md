# L-85M-R5-R3A — Proof route registration audit

**Gate UTC:** 2026-06-20

---

## Question: Is proof route present in tracked source @ `e84f007`?

**YES**

## Registration points

| Layer | File | Evidence |
|-------|------|----------|
| Root rewrite | `vercel.json` L32–34 | `/ops/db-readonly-proof` → `/api/ops/db-readonly-proof` |
| Vercel API handler | `api/ops/db-readonly-proof.mjs` | Default export handler; GET gate |
| Pre-bootstrap routes | `server/lib/prebootstrapDbReadonlyProofGuard.mjs` L3–6 | `/ops/db-readonly-proof`, `/api/admin/ops/db-readonly-proof` |
| Slim handler | `server/handlers/slimDbReadonlyProofPrebootstrapHandler.mjs` | Calls guard + optional pass-through |
| Serverless index | `server/api/index.mjs` L116–128 | Same slim handler branch |
| Express mount | `server/src/app.js` L214–216 | `app.use('/ops', … opsRoutes)` |
| Express route | `server/src/routes/ops.routes.js` L73–77 | `router.get('/db-readonly-proof', …)` |
| Contract | `server/src/lib/dbReadonlyProofContract.js` | Expected role `zora_walat_readonly_audit` |

## Missing export/import (static)

No missing default export on `api/ops/db-readonly-proof.mjs`. Import paths to `../../server/...` resolve in repo layout.

## Static registration gap found?

**NO** — route wiring is present at all tracked layers.

---

*End.*
