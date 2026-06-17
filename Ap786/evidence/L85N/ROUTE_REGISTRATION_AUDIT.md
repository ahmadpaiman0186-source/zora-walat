# L-85N — Route registration audit

**Scope:** Tracked repository files only.

---

## 1) Is `GET /ops/db-readonly-proof` registered?

| Question | Answer |
|----------|--------|
| Registered in server routes? | **YES** |

### Registration location

| Item | Value |
|------|--------|
| File | `server/src/routes/ops.routes.js` |
| Route declaration | `router.get('/db-readonly-proof', …)` |
| Handler | `executeDbReadonlyProof(req)` from `server/src/services/dbReadonlyProofService.js` |
| Contract helpers | `server/src/lib/dbReadonlyProofContract.js` |

---

## 2) Express mount wiring

| Item | Value |
|------|--------|
| Mount file | `server/src/app.js` |
| Mount paths | `app.use('/ops', …, opsRoutes)` and `app.use('/api/admin/ops', …, opsRoutes)` |
| Effective URLs | `/ops/db-readonly-proof`, `/api/admin/ops/db-readonly-proof` |

**Conclusion:** Route **is mounted** in the server Express entrypoint used by `createValidatedApp()`.

---

## 3) Vercel serverless entry (`server/api/index.mjs`)

| Question | Answer |
|----------|--------|
| Slim pre-bootstrap route for `/ops/db-readonly-proof`? | **NO** — not listed in slim bypass block |
| Reachability when `server/vercel.json` active | **YES** — falls through to `getHandler()` → Express → `/ops/*` mounts |

`server/api/index.mjs` slim routes include `/api/ops/staging-operator-*` paths only — not `/ops/db-readonly-proof`.

---

## 4) Security / service behavior (tracked code)

| Requirement | Status |
|-------------|--------|
| Requires `OPS_HEALTH_TOKEN` | **YES** — via `opsInfraHealthTokenMatches` / fail-closed gates in `dbReadonlyProofService.js` |
| Avoids owner `DATABASE_URL` fallback | **YES** — uses `READ_ONLY_DATABASE_URL` only; static test enforces no `process.env.DATABASE_URL` in service |
| Avoids owner Prisma singleton | **YES** — `createReadonlyProofPrismaClient` separate instance |
| Avoids row export | **YES** — catalog/privilege metadata SQL only |
| Avoids write probes | **YES** — `has_table_privilege` checks only |

---

## 5) Local tests

| Item | Status |
|------|--------|
| Tests present | **YES** — `server/test/dbReadonlyProof.test.js`, `server/test/helpers/dbReadonlyProofRouteChild.test.js` |
| Script | `npm --prefix server run test:db-readonly-proof` |
| Passing at L-85N baseline | **YES** — 10/10 |

---

## 6) Audit verdict

| Field | Value |
|-------|--------|
| Route registered in tracked code | **YES** |
| Route mounted in server entrypoint | **YES** |
| Route live on staging (L-85M) | **NO** — deployment/routing issue, not missing registration in repo |

---

*End.*
