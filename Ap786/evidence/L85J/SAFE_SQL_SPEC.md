# L-85J — Safe SQL specification (design only)

SQL allowed in a **future** read-only runtime proof implementation. **No SQL executed in L-85J.**

---

## 1) Principles

| Principle | Rule |
|-----------|------|
| Metadata only | Query catalogs and privilege functions — never business table rows |
| Read-only session | Session must not execute DML/DDL |
| No write probes | Do not attempt INSERT/UPDATE/DELETE to test denial |
| No destructive SQL | No TRUNCATE, DROP, ALTER, CREATE |
| Parameterized identifiers | Table names from fixed allowlist — never user input |
| Error safety | Catch errors; return safe category codes only — never raw SQL error text to client |

---

## 2) Allowed safe checks

### A) Session identity

```sql
SELECT current_user;
SELECT current_database();
```

**Implementation note:** Compare results internally to expected constants; expose only boolean flags (`readonly_role_expected`, `database_expected`) — do not echo raw role/database strings in HTTP JSON if policy requires maximum redaction. If strings are returned, they must be non-secret role/database names only — never connection components.

**L-85J contract default:** boolean flags only (see `ENDPOINT_CONTRACT.md`).

### B) Role catalog flags

Query `pg_roles` (or equivalent) for `current_user`:

| Flag | Required value for PASS |
|------|---------------------------|
| `rolsuper` | **false** |
| `rolcreatedb` | **false** |
| `rolcreaterole` | **false** |

Design SQL shape (illustrative — not executed):

```sql
SELECT rolsuper, rolcreatedb, rolcreaterole
FROM pg_roles
WHERE rolname = current_user;
```

Response mapping:

- `role_superuser_false: true` iff `rolsuper = false`
- `role_createdb_false: true` iff `rolcreatedb = false`
- `role_createrole_false: true` iff `rolcreaterole = false`

### C) Table privilege checks (scoped tables)

For each table in the fixed six-table allowlist, use **`has_table_privilege`** (preferred) or `information_schema.table_privileges` — **privilege metadata only**.

Tables (quoted identifiers — Prisma-style names):

1. `"PaymentCheckout"`
2. `"StripeWebhookEvent"`
3. `"AuditLog"`
4. `"FulfillmentAttempt"`
5. `"CanonicalTransaction"`
6. `"LedgerJournalEntry"`

Per table, verify:

| Privilege | Required for PASS |
|-----------|-------------------|
| SELECT | **true** |
| INSERT | **false** |
| UPDATE | **false** |
| DELETE | **false** |
| TRUNCATE | **false** |

Illustrative per-table check (not executed):

```sql
SELECT
  has_table_privilege(current_user, '"PaymentCheckout"', 'SELECT') AS sel,
  has_table_privilege(current_user, '"PaymentCheckout"', 'INSERT') AS ins,
  has_table_privilege(current_user, '"PaymentCheckout"', 'UPDATE') AS upd,
  has_table_privilege(current_user, '"PaymentCheckout"', 'DELETE') AS del,
  has_table_privilege(current_user, '"PaymentCheckout"', 'TRUNCATE') AS trunc;
```

Aggregate response flags:

- `select_allowed_all_scoped_tables: true` iff SELECT true for **all six**
- `write_denied_all_scoped_tables: true` iff INSERT, UPDATE, DELETE, TRUNCATE all **false** for **all six**

Set `scoped_tables_checked_count: 6` when all six evaluated.

---

## 3) Forbidden SQL behavior

| Category | Forbidden |
|----------|-----------|
| Row reads | `SELECT *`, `SELECT col FROM …`, `COUNT(*)` on business tables |
| Customer data | Any query returning PII or user rows |
| Payment data | Any query returning payment/checkout/ledger **row** content |
| Provider data | Reloadly/Stripe/provider payload tables beyond privilege metadata |
| Transaction rows | Any ledger/journal **row** export |
| Write probes | Test INSERT/UPDATE/DELETE to assert denial |
| DDL | CREATE, ALTER, DROP, TRUNCATE execution |
| DML | INSERT, UPDATE, DELETE execution |
| Destructive | Any mutating or schema-changing statement |
| Dynamic SQL from input | Any identifier not from fixed allowlist |
| Connection introspection leak | `inet_server_addr`, `inet_client_addr`, connection string fragments in SELECT list returned to client |

---

## 4) Optional additional safe checks (future gate may include)

| Check | Purpose |
|-------|---------|
| `pg_is_in_recovery()` | Boolean only — not a privilege proof |
| `current_setting('transaction_read_only')` | Session read-only hint — supplementary only |

These **must not** replace privilege matrix checks.

---

## 5) Error handling (design)

| Failure | Client sees | Logs contain |
|---------|-------------|--------------|
| Connection refused | `verdict: FAIL` or `BLOCKED`; safe category enum | Safe category only — no URL |
| Auth failure | `verdict: FAIL`; `readonly_role_expected: false` possible | No password |
| Timeout | `verdict: FAIL`; readiness-style timeout code | No stack to client |
| Unexpected SQL error | `verdict: FAIL`; `db_check_category: prisma_connectivity` (example) | Classified name only |

**Never** return raw SQL error, SQLSTATE message, or connection string to HTTP client.

---

## 6) L-85J execution status

| Item | Status |
|------|--------|
| SQL executed in L-85J | **NO** |
| Neon connected | **NO** |
| DB queries run | **NO** |

---

*End.*
