import { randomUUID } from 'node:crypto';

import { env } from '../../config/env.js';
import { PAYMENT_STATUS } from '../../domain/topupOrder/statuses.js';
import { FULFILLMENT_STATUS } from '../../domain/topupOrder/statuses.js';
import { isPersistedFulfillmentErrorRetryable } from '../../domain/topupOrder/webtopFulfillmentAutoRetryPolicy.js';
import { prisma } from '../../db.js';
import { webTopupLog } from '../../lib/webTopupObservability.js';
import { dispatchWebTopupFulfillment } from './webTopupFulfillmentService.js';

/**
 * Scans for paid orders that failed with a retryable code and are due for automatic re-dispatch.
 * Uses atomic updateMany to avoid duplicate concurrent dispatch.
 *
 * @param {{ limit?: number; log?: import('pino').Logger }} [opts]
 */
export async function processWebTopupFulfillmentAutoRetries(opts = {}) {
  if (!env.webtopupAutoRetryEnabled) {
    return { claimed: 0, dispatched: 0 };
  }

  const limit = opts.limit ?? 10;
  const log = opts.log;
  const now = new Date();

  const candidates = await prisma.webTopupOrder.findMany({
    where: {
      paymentStatus: PAYMENT_STATUS.PAID,
      fulfillmentStatus: FULFILLMENT_STATUS.FAILED,
      fulfillmentNextRetryAt: { lte: now, not: null },
    },
    orderBy: { fulfillmentNextRetryAt: 'asc' },
    take: limit,
    select: {
      id: true,
      fulfillmentErrorCode: true,
      fulfillmentAttemptCount: true,
    },
  });

  let dispatched = 0;

  for (const c of candidates) {
    if (!isPersistedFulfillmentErrorRetryable(c.fulfillmentErrorCode)) {
      await prisma.webTopupOrder
        .updateMany({
          where: { id: c.id, fulfillmentNextRetryAt: { not: null } },
          data: { fulfillmentNextRetryAt: null },
        })
        .catch(() => {});
      continue;
    }

    const claimed = await prisma.webTopupOrder.updateMany({
      where: {
        id: c.id,
        paymentStatus: PAYMENT_STATUS.PAID,
        fulfillmentStatus: FULFILLMENT_STATUS.FAILED,
        fulfillmentNextRetryAt: { lte: now },
      },
      data: {
        fulfillmentStatus: FULFILLMENT_STATUS.PENDING,
        fulfillmentNextRetryAt: null,
        fulfillmentErrorCode: null,
        fulfillmentErrorMessageSafe: null,
        fulfillmentFailedAt: null,
      },
    });

    if (claimed.count !== 1) continue;

    const traceId = `ar_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
    webTopupLog(log, 'info', 'fulfillment_retry_attempt', {
      orderId: c.id,
      orderIdSuffix: c.id.slice(-8),
      attemptCount: c.fulfillmentAttemptCount,
      nextAttemptNo: c.fulfillmentAttemptCount + 1,
      errorCode: c.fulfillmentErrorCode,
      traceId,
    });

    try {
      await dispatchWebTopupFulfillment(c.id, log, {
        traceId,
        idempotencyKey: `auto_retry:${c.id}:${traceId}`,
      });
      dispatched += 1;
    } catch (e) {
      webTopupLog(log, 'warn', 'fulfillment_dispatch_rejected', {
        orderIdSuffix: c.id.slice(-8),
        reason: e?.code ?? 'dispatch_error',
        mode: 'auto_retry',
        traceId,
      });
    }
  }

  return { claimed: candidates.length, dispatched };
}
