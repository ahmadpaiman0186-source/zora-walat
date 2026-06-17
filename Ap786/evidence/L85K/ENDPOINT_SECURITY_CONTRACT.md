# L-85K — Endpoint security contract (as implemented)

**Endpoint:** `GET /ops/db-readonly-proof`

---

## 1) Authentication — fail closed

| Condition | HTTP | `verdict` | `blocked_reason` |
|-----------|------|-----------|-------------------|
| `OPS_HEALTH_TOKEN` not configured (< 16 chars) | 401 | BLOCKED | token_invalid |
| No token header | 401 | BLOCKED | token_missing |
| Invalid token | 401 | BLOCKED | token_invalid |

Accepted headers: `Authorization: Bearer …`, `X-ZW-Ops-Token`.

---

## 2) Environment — read-only URL only

| Condition | HTTP | `verdict` | `blocked_reason` |
|-----------|------|-----------|-------------------|
| `READ_ONLY_DATABASE_URL` missing/empty | 503 | BLOCKED | readonly_url_missing |

**Never** reads or falls back to `DATABASE_URL`.

---

## 3) DB client isolation

| Rule | Enforced |
|------|----------|
| Separate `PrismaClient` instance | **YES** |
| Owner `server/src/db.js` import | **NO** |
| Owner Prisma singleton | **NO** |
| `owner_database_url_fallback_used` in response | always **false** |

---

## 4) SQL constraints (when URL present)

**Allowed:** `current_user`, `current_database()`, `pg_roles` flags, `has_table_privilege` on six scoped tables via `pg_class` catalog join.

**Forbidden:** row reads, DML, DDL, write probes, business table SELECT.

---

## 5) Response contract

### Required safe fields

All responses include fixed invariants:

- `no_rows_exported: true`
- `secret_disclosure: false`
- `owner_database_url_fallback_used: false`

### Allowed proof fields

`readonly_role_expected`, `database_expected`, `role_superuser_false`, `role_createdb_false`, `role_createrole_false`, `scoped_tables_checked_count`, `select_allowed_all_scoped_tables`, `write_denied_all_scoped_tables`, `verdict`, optional `blocked_reason` / `fail_reason`, `checked_at`.

### Forbidden in response

password, token, host, URL, connection string, raw `.env`, raw SQL error, table rows, customer/payment/provider/transaction data.

---

## 6) Error handling

DB connection/SQL failures → `verdict: FAIL`, `fail_reason: db_connect_failed` — no raw error text to client.

Logs must not include connection URLs or passwords (service uses classified failure path only).

---

## 7) L-85K proof status

| Claim | Status |
|-------|--------|
| Contract implemented in code | **YES** |
| Runtime proof on deployed staging | **NO** |
| Vercel env binding proof | **NO** |

---

*End.*
