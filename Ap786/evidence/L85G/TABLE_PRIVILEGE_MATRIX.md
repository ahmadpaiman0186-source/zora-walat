# L-85G — Table privilege matrix

**Role:** `zora_walat_readonly_audit`  
**Verification:** `has_table_privilege(current_user, …)` — live session as read-only role

| Table | Exists | SELECT | INSERT | UPDATE | DELETE | TRUNCATE |
|-------|--------|--------|--------|--------|--------|----------|
| `PaymentCheckout` | YES | true | false | false | false | false |
| `StripeWebhookEvent` | YES | true | false | false | false | false |
| `AuditLog` | YES | true | false | false | false | false |
| `FulfillmentAttempt` | YES | true | false | false | false | false |
| `CanonicalTransaction` | YES | true | false | false | false | false |
| `LedgerJournalEntry` | YES | true | false | false | false | false |

**All scope tables exist:** YES  
**Row data exported:** NO

---

*End.*
