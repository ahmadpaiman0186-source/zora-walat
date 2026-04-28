import { prisma } from '../db.js';

/**
 * Staff / operator snapshot: WebTopupOrder aggregates (no PII).
 * Cheap counts for incident triage; not a full BI export.
 */
export async function getWebTopupMoneyPathCountSnapshot() {
  const full = await getMoneyPathOperatorSnapshot();
  return {
    generatedAt: full.generatedAt,
    webTopupOrders: full.webTopupOrders,
  };
}

/**
 * Unified money-path DB histograms: marketing WebTopup + Phase 1 `PaymentCheckout` rows.
 * No PII; suitable for `/ops/summary` and incident response.
 */
export async function getMoneyPathOperatorSnapshot() {
  const [byPaymentStatus, byFulfillmentStatus, phase1ByOrderStatus] =
    await Promise.all([
      prisma.webTopupOrder.groupBy({
        by: ['paymentStatus'],
        _count: { _all: true },
      }),
      prisma.webTopupOrder.groupBy({
        by: ['fulfillmentStatus'],
        _count: { _all: true },
      }),
      prisma.paymentCheckout.groupBy({
        by: ['orderStatus'],
        _count: { _all: true },
      }),
    ]);

  return {
    generatedAt: new Date().toISOString(),
    webTopupOrders: {
      byPaymentStatus: Object.fromEntries(
        byPaymentStatus.map((r) => [r.paymentStatus, r._count._all]),
      ),
      byFulfillmentStatus: Object.fromEntries(
        byFulfillmentStatus.map((r) => [r.fulfillmentStatus, r._count._all]),
      ),
    },
    phase1PaymentCheckout: {
      byOrderStatus: Object.fromEntries(
        phase1ByOrderStatus.map((r) => [r.orderStatus, r._count._all]),
      ),
    },
  };
}
