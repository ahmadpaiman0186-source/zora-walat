# L-85J — Future endpoint contract

**Endpoint candidate:** `GET /ops/db-readonly-proof`  
**Status:** DESIGN ONLY — not implemented, not callable in L-85J.

---

## 1) HTTP semantics

| Field | Value |
|-------|-------|
| Method | `GET` |
| Body | none allowed |
| Query params | none required; **no** user-supplied table/SQL parameters |
| Cache | `Cache-Control: no-store` |
| Content-Type | `application/json` |

### Authentication

| Header | Requirement |
|--------|-------------|
| `Authorization: Bearer <OPS_HEALTH_TOKEN>` | Accepted |
| `X-ZW-Ops-Token: <OPS_HEALTH_TOKEN>` | Accepted (alias pattern from existing infra gate) |

**Fail closed:** missing or invalid token → no DB connection attempt (same posture as `/ops/health` under prelaunch).

---

## 2) Allowed response fields (safe structural JSON only)

Future implementation may return **only** these fields (plus optional safe metadata enums):

| Field | Type | Meaning |
|-------|------|---------|
| `readonly_role_expected` | boolean | Connected session role matches configured expected read-only role |
| `database_expected` | boolean | Connected database matches configured expected database |
| `role_superuser_false` | boolean | `rolsuper` is false for session role |
| `role_createdb_false` | boolean | `rolcreatedb` is false |
| `role_createrole_false` | boolean | `rolcreaterole` is false |
| `scoped_tables_checked_count` | integer | Count of scope tables evaluated (expect **6**) |
| `select_allowed_all_scoped_tables` | boolean | SELECT granted on all scoped tables |
| `write_denied_all_scoped_tables` | boolean | INSERT/UPDATE/DELETE/TRUNCATE denied on all scoped tables |
| `no_rows_exported` | boolean | Must always be **true** — design invariant |
| `secret_disclosure` | boolean | Must always be **false** — design invariant |
| `owner_database_url_fallback_used` | boolean | Must always be **false** — design invariant |
| `verdict` | enum | **`PASS`** \| **`BLOCKED`** \| **`FAIL`** only |

Optional safe diagnostic enums (no free text):

| Field | Type | Example values |
|-------|------|----------------|
| `blocked_reason` | enum | `token_missing`, `token_invalid`, `readonly_url_missing`, `tier_not_staging`, `endpoint_disabled` |
| `fail_reason` | enum | `role_mismatch`, `database_mismatch`, `superuser_true`, `write_privilege_present`, `select_missing`, `db_connect_failed`, `check_timeout` |
| `checked_at` | ISO-8601 timestamp | UTC timestamp — no secrets |

---

## 3) Forbidden response content

The future endpoint **must not** return:

| Forbidden | Examples |
|-----------|----------|
| password | any credential fragment |
| token | `OPS_HEALTH_TOKEN`, JWT, API keys |
| host | database hostname |
| URL | connection string, JDBC/PostgreSQL URI |
| connection string | full or partial |
| raw `.env` | any env dump |
| raw SQL error | Postgres message text, SQLSTATE detail |
| table rows | any business row payload |
| user/customer data | PII |
| payment data | checkout amounts, PI ids (even suffix-only if policy forbids) |
| provider data | Reloadly/Stripe payloads |
| transaction rows | ledger/journal content |
| provider payloads | third-party API responses |
| Stripe/payment secrets | `sk_`, `whsec_`, etc. |

---

## 4) Example response shapes (illustrative — not live)

### PASS (future — not claimed in L-85J)

```json
{
  "readonly_role_expected": true,
  "database_expected": true,
  "role_superuser_false": true,
  "role_createdb_false": true,
  "role_createrole_false": true,
  "scoped_tables_checked_count": 6,
  "select_allowed_all_scoped_tables": true,
  "write_denied_all_scoped_tables": true,
  "no_rows_exported": true,
  "secret_disclosure": false,
  "owner_database_url_fallback_used": false,
  "verdict": "PASS",
  "checked_at": "2026-06-16T00:00:00.000Z"
}
```

### BLOCKED — read-only URL missing (future)

```json
{
  "readonly_role_expected": false,
  "database_expected": false,
  "role_superuser_false": false,
  "role_createdb_false": false,
  "role_createrole_false": false,
  "scoped_tables_checked_count": 0,
  "select_allowed_all_scoped_tables": false,
  "write_denied_all_scoped_tables": false,
  "no_rows_exported": true,
  "secret_disclosure": false,
  "owner_database_url_fallback_used": false,
  "verdict": "BLOCKED",
  "blocked_reason": "readonly_url_missing",
  "checked_at": "2026-06-16T00:00:00.000Z"
}
```

### FAIL — write privilege detected (future)

```json
{
  "readonly_role_expected": true,
  "database_expected": true,
  "role_superuser_false": true,
  "role_createdb_false": true,
  "role_createrole_false": true,
  "scoped_tables_checked_count": 6,
  "select_allowed_all_scoped_tables": true,
  "write_denied_all_scoped_tables": false,
  "no_rows_exported": true,
  "secret_disclosure": false,
  "owner_database_url_fallback_used": false,
  "verdict": "FAIL",
  "fail_reason": "write_privilege_present",
  "checked_at": "2026-06-16T00:00:00.000Z"
}
```

---

## 5) HTTP status code mapping (design recommendation)

| Verdict | Suggested HTTP status |
|---------|------------------------|
| `PASS` | `200` |
| `FAIL` | `503` or `200` with FAIL — future gate picks one; must document in proof gate |
| `BLOCKED` | `503` or `401` when token/env precondition |

Conservative default: **`503`** for `FAIL` and `BLOCKED` preconditions to avoid cacheable false greens.

---

## 6) L-85J status

| Item | Value |
|------|-------|
| Endpoint exists | **NO** |
| Endpoint called | **NO** |
| Response captured | **NO** |

---

*End.*
