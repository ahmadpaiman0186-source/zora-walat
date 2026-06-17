# L-85K — Implementation report

**Status:** Guarded endpoint structure implemented — **no live runtime proof**.

---

## 1) Endpoint

| Field | Value |
|-------|--------|
| Method | `GET` |
| Path | `/ops/db-readonly-proof` |
| Also mounted | `/api/admin/ops/db-readonly-proof` (via existing ops router mount) |
| Implemented | **YES** |

---

## 2) Code files added/changed

| File | Change |
|------|--------|
| `server/src/lib/dbReadonlyProofContract.js` | **Added** — scoped tables, response builders, allowed keys |
| `server/src/services/dbReadonlyProofService.js` | **Added** — fail-closed handler, separate Prisma client, metadata SQL |
| `server/src/routes/ops.routes.js` | **Modified** — route registration |
| `server/test/dbReadonlyProof.test.js` | **Added** — unit + static + subprocess route tests |
| `server/test/helpers/dbReadonlyProofRouteChild.test.js` | **Added** — route tests with env before app load |
| `server/package.json` | **Modified** — `test:db-readonly-proof` script |

---

## 3) Behavior summary

| Requirement | Implementation |
|-------------|----------------|
| `OPS_HEALTH_TOKEN` required | Always — missing → `BLOCKED` / `token_missing`; invalid → `token_invalid` |
| `READ_ONLY_DATABASE_URL` missing | `BLOCKED` / `readonly_url_missing` — no DB connect |
| Owner `DATABASE_URL` fallback | **Never** — separate client from read-only URL only |
| Owner Prisma singleton | **Never** — `createReadonlyProofPrismaClient` only |
| Row export | **Forbidden** — catalog/privilege metadata SQL only |
| Write probes | **Forbidden** — privilege checks via `has_table_privilege` only |
| Response | Boolean/structural fields + `PASS` / `BLOCKED` / `FAIL` |
| Fixed invariants | `no_rows_exported: true`, `secret_disclosure: false`, `owner_database_url_fallback_used: false` |

---

## 4) Dependency decision

| Client | Status |
|--------|--------|
| `@prisma/client` (existing) | **Used** — ephemeral `PrismaClient` with `READ_ONLY_DATABASE_URL` datasource override |
| New npm dependency | **NO** |

No dependency blocker — existing approved Prisma client used with isolated instance.

---

## 5) Live execution in L-85K

| Action | Performed |
|--------|-----------|
| Connect to Neon | **NO** |
| Live DB metadata query | **NO** |
| HTTP call to deployed staging | **NO** |
| `.env.local` read | **NO** |
| `READ_ONLY_DATABASE_URL` live value read | **NO** |

When `READ_ONLY_DATABASE_URL` is set in a future authorized deploy, the endpoint will attempt metadata checks; that proof is **out of scope** for L-85K.

---

## 6) Verdict

**`L-85K_GUARDED_ENDPOINT_IMPLEMENTATION_FILED_LOCAL_ONLY__NO_RUNTIME_PROOF_NO_GLOBAL_MONEY_PROVIDER_MARKET_CLAIMS`**

---

*End.*
