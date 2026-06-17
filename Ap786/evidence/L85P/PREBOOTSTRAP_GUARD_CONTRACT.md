# L-85P — Pre-bootstrap guard contract

**Route(s):** `GET /ops/db-readonly-proof`, `GET /api/admin/ops/db-readonly-proof`  
**Activation:** `server/api/index.mjs` before `getHandler()` / bootstrap

---

## Missing token

| Field | Value |
|-------|-------|
| HTTP status | `401` |
| `ok` | `false` |
| `verdict` | `"BLOCKED"` |
| `reason` | `"token_missing"` |
| `route` | matched path |
| `auth_required` | `true` |
| `prebootstrap_guard` | `true` |
| `db_query_performed` | `false` |
| `row_export_occurred` | `false` |
| `write_probe_occurred` | `false` |
| `secret_disclosure` | `false` |
| `owner_database_url_fallback_used` | `false` |
| `runtime_db_identity_proof` | `false` |
| `readonly_database_url_proof` | `false` |

Must **not** import DB client, initialize Prisma, connect to DB, or call `dbReadonlyProofService`.

## Invalid token (or unconfigured OPS token)

| Field | Value |
|-------|-------|
| HTTP status | `401` |
| `reason` | `"token_invalid"` |

Same safe structural fields as missing token. Constant-time comparison when comparing presented vs configured token.

## Valid token + no READ_ONLY_DATABASE_URL (presence only)

| Field | Value |
|-------|-------|
| HTTP status | `503` |
| `reason` | `"readonly_url_missing"` |

Still pre-bootstrap; no DB proof. No env value exposure.

## Valid token + READ_ONLY_DATABASE_URL present

`action: pass_through` → delegates to existing Express route via `getHandler()` for **future** L-85M authorized proof. **Not exercised** in L-85P tests or evidence.

## Forbidden response content

- password, token, URL, host, connection string
- raw `.env`, raw SQL errors, DB rows
- user/customer/payment/provider data

---

*End.*
