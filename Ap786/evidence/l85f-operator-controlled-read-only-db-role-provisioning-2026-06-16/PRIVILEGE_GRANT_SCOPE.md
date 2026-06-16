# L-85F — Privilege grant scope

## Scoped tables

| Table | GRANT SELECT | INSERT | UPDATE | DELETE |
|-------|--------------|--------|--------|--------|
| `PaymentCheckout` | **YES** | **NO** | **NO** | **NO** |
| `StripeWebhookEvent` | **YES** | **NO** | **NO** | **NO** |
| `AuditLog` | **YES** | **NO** | **NO** | **NO** |
| `FulfillmentAttempt` | **YES** | **NO** | **NO** | **NO** |
| `CanonicalTransaction` | **YES** | **NO** | **NO** | **NO** |
| `LedgerJournalEntry` | **YES** | **NO** | **NO** | **NO** |

**Verification method:** `has_table_privilege('zora_walat_readonly_audit', …)` from owner session immediately post-grant — **not** a live login as the read-only role (L-85G).

## Grants not performed

- INSERT / UPDATE / DELETE / TRUNCATE on any table
- CREATE on schema (beyond role DDL)
- GRANT on non-scoped tables
- Default privileges change (not included in this execution)

---

*End.*
