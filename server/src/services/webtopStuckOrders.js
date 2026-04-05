import { env } from '../config/env.js';
import { prisma } from '../db.js';
import { FULFILLMENT_STATUS } from '../domain/topupOrder/statuses.js';

/**
 * Counts web top-up orders stuck in queued/processing longer than reconciliation thresholds.
 * Read-only — use for /ready and ops dashboards.
 */
export async function getWebTopupFulfillmentStuckSummary() {
  const now = new Date();
  const queuedCutoff = new Date(
    now.getTime() - env.reconcileFulfillmentQueuedStuckAfterMs,
  );
  const processingCutoff = new Date(
    now.getTime() - env.reconcileFulfillmentProcessingStuckAfterMs,
  );

  const [queuedStuck, processingStuck] = await Promise.all([
    prisma.webTopupOrder.count({
      where: {
        fulfillmentStatus: FULFILLMENT_STATUS.QUEUED,
        fulfillmentRequestedAt: { lt: queuedCutoff },
      },
    }),
    prisma.webTopupOrder.count({
      where: {
        fulfillmentStatus: FULFILLMENT_STATUS.PROCESSING,
        fulfillmentRequestedAt: { lt: processingCutoff },
      },
    }),
  ]);

  return {
    queuedStuck,
    processingStuck,
    thresholdQueuedMs: env.reconcileFulfillmentQueuedStuckAfterMs,
    thresholdProcessingMs: env.reconcileFulfillmentProcessingStuckAfterMs,
    checkedAt: now.toISOString(),
  };
}
