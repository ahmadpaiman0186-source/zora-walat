# L-85D — Schema table scope

**Source:** `server/prisma/schema.prisma` (read-only review)

Side-effect tables evaluated for checkout / payment / webhook / fulfillment / audit / ledger boundaries:

| Prisma model | Table | Relevance |
|--------------|-------|-----------|
| `PaymentCheckout` | `PaymentCheckout` | Checkout sessions, Stripe IDs, order lifecycle |
| `StripeWebhookEvent` | `StripeWebhookEvent` | Processed Stripe webhook event ids (`evt_…`) |
| `AuditLog` | `AuditLog` | Generic audit rows (incl. webhook non-money audit via `writeOrderAudit`) |
| `FulfillmentAttempt` | `FulfillmentAttempt` | Provider fulfillment tries per order |
| `CanonicalTransaction` | `CanonicalTransaction` | Mirror projection — not money SoT |
| `LedgerJournalEntry` | `LedgerJournalEntry` | Double-entry journal headers |

## Timestamp columns (for window-bound SELECT counts)

| Table | Primary time column |
|-------|----------------------|
| `PaymentCheckout` | `createdAt` |
| `StripeWebhookEvent` | `receivedAt` |
| `AuditLog` | `createdAt` |
| `FulfillmentAttempt` | `createdAt` |
| `CanonicalTransaction` | `createdAt` |
| `LedgerJournalEntry` | `createdAt` |

## L-85D probe scope

Privilege inspection (`has_table_privilege`) only — **no row reads**, **no writes**, **no DDL**.

---

*End.*
