# L-85D — Table privilege matrix

**Method:** SELECT-only `has_table_privilege(current_user, …)` — **no INSERT/UPDATE/DELETE test queries**.

**Connected as:** `neondb_owner` via `DATABASE_URL`

---

## Required tables — privilege probe

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `PaymentCheckout` | **true** | **true** | **true** | **true** |
| `StripeWebhookEvent` | **true** | **true** | **true** | **true** |
| `AuditLog` | **true** | **true** | **true** | **true** |
| `FulfillmentAttempt` | **true** | **true** | **true** | **true** |
| `CanonicalTransaction` | **true** | **true** | **true** | **true** |
| `LedgerJournalEntry` | **true** | **true** | **true** | **true** |

---

## VERDICT-001 requirement check

| Requirement | Met? |
|-------------|------|
| Dedicated non-owner DB role used | **NO** |
| SELECT true on all required tables | **YES** |
| INSERT false on all required tables | **NO** — all **true** |
| UPDATE false on all required tables | **NO** — all **true** |
| DELETE false on all required tables | **NO** — all **true** |
| No mutation query executed | **YES** |

**Dedicated read-only role:** **NOT PROVEN** — **`READ_ONLY_ROLE_NOT_PROVEN`**

---

*End.*
