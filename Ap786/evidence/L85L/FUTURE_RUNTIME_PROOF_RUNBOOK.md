# L-85L — Future runtime proof runbook

**Status:** RUNBOOK ONLY — **do not execute in L-85L**.

Designed for future **L-85M** controlled HTTP proof after authorized Vercel env binding.

---

## 1) Pre-flight (repo — no live calls)

| Step | Command / check | Pass criterion |
|------|---------------|----------------|
| P1 | Branch baseline | `main` includes L-85K (PR #270) |
| P2 | Endpoint exists | `GET /ops/db-readonly-proof` in `server/src/routes/ops.routes.js` |
| P3 | Unit/route tests | `npm --prefix server run test:db-readonly-proof` — all pass |
| P4 | Secrets scan | `npm --prefix server run secrets:scan` — OK |
| P5 | L-85L authorization gate | Filed and reviewed |
| P6 | L-85M operator authorization | Explicit attestation recorded |

---

## 2) Operator pre-flight (Vercel — future L-85M)

| Step | Action |
|------|--------|
| O1 | Confirm Vercel account (operator attestation) |
| O2 | Confirm project name matches authorization record |
| O3 | Confirm environment = staging (first proof) |
| O4 | Confirm root directory = API project (`server/` expected — operator UI proof) |
| O5 | Set `READ_ONLY_DATABASE_URL` per [FUTURE_ENV_BINDING_PLAN.md](./FUTURE_ENV_BINDING_PLAN.md) |
| O6 | Redeploy **only if explicitly authorized** and required for env pickup |
| O7 | Capture **deploy ID** (structural — no secrets) |

---

## 3) Controlled HTTP proof (future L-85M)

| Step | Action |
|------|--------|
| H1 | Prepare `OPS_HEALTH_TOKEN` from secure storage — never print |
| H2 | `GET /ops/db-readonly-proof` with `Authorization: Bearer <token>` or `X-ZW-Ops-Token` |
| H3 | Capture **response JSON flags only** — redact before filing if any unexpected keys |
| H4 | Do **not** capture response headers that may leak infra details unnecessarily |
| H5 | Do **not** retry with owner URL or alternate env |

**L-85L:** No HTTP call performed.

---

## 4) Required PASS flags (future evidence)

All must be **true** for conservative runtime proof PASS:

| Flag | Required value |
|------|----------------|
| `readonly_role_expected` | **true** |
| `database_expected` | **true** |
| `role_superuser_false` | **true** |
| `role_createdb_false` | **true** |
| `role_createrole_false` | **true** |
| `scoped_tables_checked_count` | **6** (expected L-85G scope count) |
| `select_allowed_all_scoped_tables` | **true** |
| `write_denied_all_scoped_tables` | **true** |
| `no_rows_exported` | **true** |
| `secret_disclosure` | **false** |
| `owner_database_url_fallback_used` | **false** |
| `verdict` | **PASS** |

---

## 5) Forbidden proof artifacts

Future evidence **must NOT** include:

| Forbidden | Reason |
|-----------|--------|
| Table rows | Business data export |
| Write probe attempts | Mutating validation forbidden |
| Raw SQL error text | Secret/leak risk |
| Connection URL / host / password | Credential leak |
| Full HTTP response if contains unexpected fields | Review before filing |
| Token value | Credential leak |

---

## 6) FAIL / BLOCKED handling (future)

| `verdict` | Action |
|-----------|--------|
| `BLOCKED` | Do not claim proof; check env bind + token + deploy |
| `FAIL` | Execute [ROLLBACK_AND_REVOCATION_PLAN.md](./ROLLBACK_AND_REVOCATION_PLAN.md); file failure evidence |
| Not `PASS` | **NO-GO** for runtime read-only proof claim |

---

## 7) Future evidence package (L-85M)

| Item | Required |
|------|----------|
| Branch + commit hash | YES |
| Deploy ID | YES (if deployed) |
| Vercel project name | YES |
| Env key name attestation | YES — no values |
| Redacted HTTP response flags | YES |
| `secrets:scan` OK post-filing | YES |
| NON_CLAIMS | YES |
| Operator authorization record | YES |

---

## 8) L-85L status

| Step | Executed |
|------|----------|
| Entire runbook | **NO** |

---

*End.*
