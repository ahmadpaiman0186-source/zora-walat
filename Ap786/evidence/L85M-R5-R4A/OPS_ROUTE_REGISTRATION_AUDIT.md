# L-85M-R5-R4A — OPS route registration audit

**Gate UTC:** 2026-06-21

---

## Question: Is `/ops/db-readonly-proof` registered in tracked source @ `2ed22e6`?

**YES** — no static registration gap.

## Registration chain

| Layer | File | Evidence |
|-------|------|----------|
| Root rewrite | `vercel.json` L32–34 | `/ops/db-readonly-proof` → `/api/ops/db-readonly-proof` |
| Vercel handler | `api/ops/db-readonly-proof.mjs` | Default export; URL shim to `/ops/db-readonly-proof` |
| Pre-bootstrap routes | `server/lib/prebootstrapDbReadonlyProofGuard.mjs` L3–6 | Both `/ops/...` and `/api/admin/ops/...` |
| Slim handler | `server/handlers/slimDbReadonlyProofPrebootstrapHandler.mjs` | Guard + optional pass-through |
| Serverless index (reference) | `server/api/index.mjs` L116–128 | Same slim branch when deployed via `server/vercel.json` |
| Express mount | `server/src/app.js` L214–216 | `app.use('/ops', … opsRoutes)` |
| Express route | `server/src/routes/ops.routes.js` L73–77 | `router.get('/db-readonly-proof', …)` |
| Proof service | `server/src/services/dbReadonlyProofService.js` | `executeDbReadonlyProof` |

## Handler behavior (static)

```73:77:server/src/routes/ops.routes.js
router.get('/db-readonly-proof', async (req, res) => {
  const result = await executeDbReadonlyProof(req);
  res.setHeader('Cache-Control', 'no-store');
  res.status(result.httpStatus).json(result.body);
});
```

`executeDbReadonlyProof` returns structured blocked/fail/pass objects; probe errors map to **`buildDbReadonlyProofFail('db_connect_failed')`** inside service try/catch — **not** `PROOF_ROUTE_BRIDGE_RUNTIME_EXCEPTION`.

## Static conclusion

Route wiring is present. R5-R4 **`PROOF_ROUTE_BRIDGE_RUNTIME_EXCEPTION`** indicates failure **outside** (or before completion of) the proof service’s controlled JSON response path — consistent with bridge pass-through / Express bootstrap, not missing route registration.

---

*End.*
