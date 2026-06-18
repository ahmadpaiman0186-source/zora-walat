# L-85X — Ops route registration audit

---

## Express registration chain

```
server/src/index.js
  → createValidatedApp() in server/src/app.js
    → app.use('/ops', apiIpLimiter, opsRoutes)
    → app.use('/api/admin/ops', apiIpLimiter, opsRoutes)
```

**Source:** `server/src/app.js` lines 214–216.

## Ops router handler

```
server/src/routes/ops.routes.js
  router.get('/db-readonly-proof', async (req, res) => {
    const result = await executeDbReadonlyProof(req);
    ...
  });
```

**Effective URLs (when Express graph is active):**

- `GET /ops/db-readonly-proof`
- `GET /api/admin/ops/db-readonly-proof`

## Serverless pre-bootstrap path (before Express)

```
server/api/index.mjs
  → slimDbReadonlyProofPrebootstrapHandler.mjs
    → prebootstrapDbReadonlyProofGuard.mjs
```

Missing/invalid token: fast **401 JSON** (L-85P).  
Valid token + `READ_ONLY_DATABASE_URL`: `passThrough` → `getHandler()` → Express route above.

## Auth / feature flags

| Layer | Mechanism |
|-------|-----------|
| Pre-bootstrap | `OPS_HEALTH_TOKEN` / `OPS_INFRA_HEALTH_TOKEN` via `process.env` (guard) |
| Express proof | `opsInfraHealthTokenMatches` in `executeDbReadonlyProof` |
| Infra prelaunch gate | `denyUnauthenticatedInfraIfPrelaunch` on `/ops/health` only — **not** on `db-readonly-proof` |

**No feature flag** disables `db-readonly-proof` in tracked code.

## Import/mount verdict

| Question | Answer |
|----------|--------|
| `ops.routes.js` imported? | **YES** — `app.js` |
| Router mounted? | **YES** — `/ops` and `/api/admin/ops` |
| `/ops/db-readonly-proof` registered? | **YES** — in server runtime graph |
| Reachable without `server/api/index.mjs`? | **NO** on Vercel — requires that entry or long-running server |

## Why 404 is not auth/prebootstrap

Tracked missing-token behavior is **401 JSON**, not 404. L-85M **404** is inconsistent with pre-bootstrap guard on an active `server/api/index.mjs` deployment — supports **route not exposed** on current artifact.

---

*End.*
