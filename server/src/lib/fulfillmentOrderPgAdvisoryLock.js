/**
 * PostgreSQL transaction-scoped advisory lock per PaymentCheckout id.
 * Serializes fulfillment claim + payment row transitions across API workers, BullMQ replicas, and inline drains
 * (same `orderId` → same `hashtext` bucket; collision across different ids is negligible for operational purposes).
 */

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {string} orderId
 */
export async function acquireFulfillmentOrderPgAdvisoryLock(tx, orderId) {
  const id = String(orderId ?? '').trim();
  if (!id) return;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}::text))`;
}
