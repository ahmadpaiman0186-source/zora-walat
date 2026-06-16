# L-85B — Read-only DB role privilege proof

**Method:** SELECT-only `has_table_privilege` probes via ephemeral local script (deleted after run).  
**Connection:** same operator-local bootstrap path as L-85A (not attested as staging runtime).

## Session identity

| Field | Value |
|-------|-------|
| `current_user` | `neondb_owner` |
| `current_database()` | `neondb` |

## Login-capable roles observed (metadata only)

| Role | Notes |
|------|-------|
| `neondb_owner` | Used for L-85A/L-85B probes |
| `neon_service` | Neon service role — not used in this gate |

No dedicated read-only login role (e.g. `*_readonly`) was observed in the capped role listing.

## Table privilege matrix (`current_user` = `neondb_owner`)

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `PaymentCheckout` | true | true | true | true |
| `StripeWebhookEvent` | true | true | true | true |
| `AuditLog` | true | true | true | true |
| `FulfillmentAttempt` | true | true | true | true |
| `CanonicalTransaction` | true | true | true | true |
| `LedgerJournalEntry` | true | true | true | true |

## Read-only posture verdict

| Check | Expected for least-privilege proof | Actual |
|-------|-----------------------------------|--------|
| SELECT on probed tables | true | **true** |
| INSERT on probed tables | false | **true** — **FAIL** |
| UPDATE on probed tables | false | **true** — **FAIL** |
| DELETE on probed tables | false | **true** — **FAIL** |

**Status:** **`READ_ONLY_ROLE_NOT_PROVEN`**

Connected user is an owner-capable role. L-85A/L-85B relied on **SELECT-only SQL discipline**; no INSERT/UPDATE/DELETE/DDL was executed in either gate.

## Mutations in this gate

**NONE.**

---

*End.*
