/**
 * L4 `LedgerJournalEntry` FKs use `onDelete: Restrict` toward `PaymentCheckout` and `FulfillmentAttempt`.
 * DB triggers enforce ledger immutability: journal rows are append-only.
 * Tests must not attempt to UPDATE/DELETE ledger journal tables.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string[]} paymentCheckoutIds
 */
export async function deleteLedgerJournalForPaymentCheckouts(
  prisma,
  paymentCheckoutIds,
) {
  void prisma;
  void paymentCheckoutIds;
  // Ledger is immutable in DB; no-op by design.
}
