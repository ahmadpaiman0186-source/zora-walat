# L-85M runtime proof — Endpoint discovery

**Fail-closed discovery from tracked source only.**

---

## Identified endpoint

| Field | Value (tracked source) |
|-------|------------------------|
| **HTTP method** | `GET` |
| **Primary path** | `/ops/db-readonly-proof` |
| **Admin alias** | `/api/admin/ops/db-readonly-proof` |
| **Staging base** | `zora-walat-api-staging.vercel.app` (from prior L-85Q evidence — not re-probed unauthenticated in this gate) |

## Source references

| File | Evidence |
|------|----------|
| `server/src/routes/ops.routes.js` | `router.get('/db-readonly-proof', …)` → `executeDbReadonlyProof(req)` |
| `server/api/index.mjs` | Pre-bootstrap guard; valid token + readonly URL → pass-through to Express |
| `server/src/services/dbReadonlyProofService.js` | `executeDbReadonlyProof` — READ_ONLY_DATABASE_URL only |
| `server/src/lib/dbReadonlyProofContract.js` | Expected role `zora_walat_readonly_audit`; safe response keys |

## Auth format (tracked)

| Header | Format |
|--------|--------|
| `Authorization` | `Bearer <OPS_HEALTH_TOKEN>` |
| `X-ZW-Ops-Token` | `<OPS_HEALTH_TOKEN>` |

Token source at runtime: `env.opsInfraHealthToken` from `OPS_HEALTH_TOKEN` or `OPS_INFRA_HEALTH_TOKEN` (`opsInfraHealthGate.js`).

## Expected safe PASS response fields

| Field | PASS expectation |
|-------|------------------|
| `verdict` | `PASS` |
| `readonly_role_expected` | `true` |
| `database_expected` | `true` |
| `role_superuser_false` | `true` |
| `role_createdb_false` | `true` |
| `role_createrole_false` | `true` |
| `select_allowed_all_scoped_tables` | `true` |
| `write_denied_all_scoped_tables` | `true` |
| `no_rows_exported` | `true` |
| `secret_disclosure` | `false` |
| `owner_database_url_fallback_used` | `false` |
| HTTP status | `200` |

## Discovery verdict

**`ENDPOINT_IDENTIFIED`** — not `L-85M_BLOCKED_ENDPOINT_NOT_IDENTIFIED`.

## Proof design notes

- Metadata-only privilege checks — **no business row export**
- No `$executeRaw` write probes in proof service
- Role name **not** returned in response body — identity inferred via `readonly_role_expected === true` on PASS

---

*End.*
