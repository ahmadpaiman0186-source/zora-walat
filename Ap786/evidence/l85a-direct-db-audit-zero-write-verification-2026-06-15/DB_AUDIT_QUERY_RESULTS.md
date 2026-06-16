# L-85A — DB / audit query results (SELECT-only, count-only)

**Window:** `2026-06-15T22:20:00.000Z` ≤ timestamp ≤ `2026-06-15T22:40:00.000Z`  
**Query status:** `QUERY_OK=YES`  
**Execution:** single session; ephemeral script; disconnected after queries

---

## 1 — Connection / recovery metadata

```sql
SELECT current_user AS db_user, pg_is_in_recovery() AS in_recovery, current_database() AS db_name
```

| db_user | in_recovery | db_name |
|---------|-------------|---------|
| neondb_owner | false | neondb |

---

## 2 — Table privilege probe (not mutation)

```sql
SELECT has_table_privilege(current_user, '"PaymentCheckout"', 'SELECT') AS pc_select,
       has_table_privilege(current_user, '"PaymentCheckout"', 'INSERT') AS pc_insert,
       ... -- StripeWebhookEvent, AuditLog, FulfillmentAttempt, CanonicalTransaction, LedgerJournalEntry
```

All probed tables: **SELECT=true**, **INSERT=true** (see [DB_ACCESS_SAFETY_ATTESTATION.md](./DB_ACCESS_SAFETY_ATTESTATION.md)).

---

## 3 — Window row counts

Timestamp columns per schema (`server/prisma/schema.prisma`):

| Table | Time column | Count in window |
|-------|-------------|-----------------|
| `PaymentCheckout` | `createdAt` | **0** |
| `PaymentCheckout` (any Stripe field non-null) | `createdAt` + stripe columns | **0** |
| `StripeWebhookEvent` | `receivedAt` | **0** |
| `FulfillmentAttempt` | `createdAt` | **0** |
| `CanonicalTransaction` | `createdAt` | **0** |
| `AuditLog` | `createdAt` | **0** |
| `LedgerJournalEntry` | `createdAt` | **0** |

---

## 4 — Stripe ID / secret pattern counts (window-bound)

Patterns checked (counts only — no row export):

| Scope | Patterns | Count |
|-------|----------|-------|
| `PaymentCheckout` | `cs_%`, `pi_%`, `cus_%`, `client_secret` in URL field | **0** |
| `CanonicalTransaction` | `cs_%`, `pi_%`, `cus_%`, `ch_%` in `externalPaymentId` | **0** |
| `AuditLog` | `cs_%`, `pi_%`, `cus_%`, `ch_%`, `client_secret` in JSON `payload` | **0** |

---

## Interpretation (conservative)

| Finding | Meaning |
|---------|---------|
| All counts **0** on connected Neon DB | No Prisma-tracked checkout/order/payment/webhook/audit/ledger rows in window **on this database** |
| Staging identity unproven | **Cannot** upgrade to VERDICT-001 for L-84ZY staging runtime |
| L-84ZZ code-path inference | Still supported separately; this gate adds **local DB count evidence only** |

---

*End.*
