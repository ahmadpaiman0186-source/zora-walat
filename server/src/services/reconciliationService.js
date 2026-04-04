import { prisma } from '../db.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../constants/paymentCheckoutStatus.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../constants/fulfillmentAttemptStatus.js';
import { RECONCILIATION_ISSUE } from '../constants/reconciliationIssue.js';
import { env } from '../config/env.js';

/**
 * Read-only reconciliation scan (no mutations).
 * @param {{ now?: Date }} [options]
 * @returns {Promise<{
 *   scannedAt: string,
 *   thresholds: Record<string, number>,
 *   summary: { total: number, byIssueType: Record<string, number> },
 *   issues: object[],
 * }>}
 */
export async function runReconciliationScan(options = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  const t = {
    paidStuckMs: env.reconcilePaidStuckAfterMs,
    processingStuckMs: env.reconcileProcessingStuckAfterMs,
    fulfillmentQueuedStuckMs: env.reconcileFulfillmentQueuedStuckAfterMs,
    fulfillmentProcessingStuckMs: env.reconcileFulfillmentProcessingStuckAfterMs,
  };

  const paidCutoff = new Date(now.getTime() - t.paidStuckMs);
  const processingCutoff = new Date(now.getTime() - t.processingStuckMs);
  const queuedCutoff = new Date(now.getTime() - t.fulfillmentQueuedStuckMs);
  const attemptProcessingCutoff = new Date(
    now.getTime() - t.fulfillmentProcessingStuckMs,
  );

  /** @type {object[]} */
  const issues = [];

  function msSince(d) {
    if (!d) return null;
    return now.getTime() - new Date(d).getTime();
  }

  function baseIssue(order, attempt) {
    return {
      orderId: order.id,
      reference: {
        idempotencyKey: order.idempotencyKey,
        stripeCheckoutSessionId: order.stripeCheckoutSessionId,
      },
      orderStatus: order.orderStatus,
      paymentCheckoutStatus: order.status,
      fulfillmentAttemptId: attempt?.id ?? null,
      fulfillmentStatus: attempt?.status ?? null,
      attemptNumber: attempt?.attemptNumber ?? null,
      detectedAt: now.toISOString(),
    };
  }

  const paidOrders = await prisma.paymentCheckout.findMany({
    where: { orderStatus: ORDER_STATUS.PAID },
    include: {
      fulfillmentAttempts: { where: { attemptNumber: 1 } },
    },
  });

  for (const o of paidOrders) {
    const att = o.fulfillmentAttempts[0];
    if (!att) {
      issues.push({
        ...baseIssue(o, null),
        issueType: RECONCILIATION_ISSUE.PAID_WITHOUT_ATTEMPT,
        ageMs: msSince(o.paidAt),
        anchor: 'paidAt',
        recommendedAction:
          'Investigate webhook / ensureQueuedFulfillmentAttempt; data may be inconsistent — manual DB review before any fix.',
        detail: 'PAID order has no fulfillment attempt row (attempt 1 missing).',
      });
      continue;
    }

    if (o.paidAt && new Date(o.paidAt) <= paidCutoff) {
      issues.push({
        ...baseIssue(o, att),
        issueType: RECONCILIATION_ISSUE.ORDER_PAID_STUCK,
        ageMs: msSince(o.paidAt),
        anchor: 'paidAt',
        recommendedAction:
          'Check fulfillment drain / scheduleFulfillmentProcessing; verify workers and logs — manual processFulfillmentForOrder only after review.',
        detail:
          'Order remains PAID beyond threshold (fulfillment not claimed or processing not started).',
      });
      continue;
    }

    if (
      att.status === FULFILLMENT_ATTEMPT_STATUS.QUEUED &&
      new Date(att.createdAt) <= queuedCutoff
    ) {
      issues.push({
        ...baseIssue(o, att),
        issueType: RECONCILIATION_ISSUE.FULFILLMENT_QUEUED_STUCK,
        ageMs: msSince(att.createdAt),
        anchor: 'attempt.createdAt',
        recommendedAction:
          'Confirm drain interval and worker health; inspect why QUEUED was not claimed.',
        detail: 'Fulfillment attempt 1 still QUEUED beyond threshold.',
      });
    }
  }

  const processingOrders = await prisma.paymentCheckout.findMany({
    where: { orderStatus: ORDER_STATUS.PROCESSING },
    include: {
      fulfillmentAttempts: { where: { attemptNumber: 1 } },
    },
  });

  for (const o of processingOrders) {
    const att = o.fulfillmentAttempts[0];
    if (!att) {
      issues.push({
        ...baseIssue(o, null),
        issueType: RECONCILIATION_ISSUE.FULFILLMENT_ORDER_MISMATCH,
        ageMs: null,
        anchor: null,
        recommendedAction:
          'Manual data review — PROCESSING without fulfillment attempt is invalid.',
        detail: 'orderStatus PROCESSING but fulfillment attempt 1 is missing.',
      });
      continue;
    }
    const anchor = att.startedAt ?? att.updatedAt ?? o.updatedAt;
    if (!anchor) continue;
    if (new Date(anchor) > processingCutoff) continue;
    issues.push({
      ...baseIssue(o, att ?? null),
      issueType: RECONCILIATION_ISSUE.ORDER_PROCESSING_STUCK,
      ageMs: msSince(anchor),
      anchor: att?.startedAt ? 'attempt.startedAt' : 'order.updatedAt',
      recommendedAction:
        'Check provider timeouts and logs; possible hung provider call — manual investigation; no automatic rollback.',
      detail: 'Order PROCESSING beyond threshold (provider or completion phase may be stuck).',
    });
  }

  const processingAttempts = await prisma.fulfillmentAttempt.findMany({
    where: {
      attemptNumber: 1,
      status: FULFILLMENT_ATTEMPT_STATUS.PROCESSING,
    },
    include: { order: true },
  });

  for (const att of processingAttempts) {
    const start = att.startedAt ?? att.updatedAt;
    if (!start || new Date(start) > attemptProcessingCutoff) continue;
    const o = att.order;
    if (
      issues.some(
        (i) =>
          i.orderId === o.id &&
          i.issueType === RECONCILIATION_ISSUE.ORDER_PROCESSING_STUCK,
      )
    ) {
      continue;
    }
    issues.push({
      ...baseIssue(o, att),
      issueType: RECONCILIATION_ISSUE.FULFILLMENT_PROCESSING_STUCK,
      ageMs: msSince(start),
      anchor: att.startedAt ? 'attempt.startedAt' : 'attempt.updatedAt',
      recommendedAction:
        'Correlate with provider dashboards; verify process did not crash mid-flight.',
      detail: 'Fulfillment attempt stuck in PROCESSING beyond threshold.',
    });
  }

  const fulfilledOrders = await prisma.paymentCheckout.findMany({
    where: { orderStatus: ORDER_STATUS.FULFILLED },
    include: {
      fulfillmentAttempts: { where: { attemptNumber: 1 } },
    },
  });

  for (const o of fulfilledOrders) {
    const att = o.fulfillmentAttempts[0];
    if (!att || att.status !== FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED) {
      issues.push({
        ...baseIssue(o, att ?? null),
        issueType: RECONCILIATION_ISSUE.FULFILLMENT_ORDER_MISMATCH,
        ageMs: null,
        anchor: null,
        recommendedAction:
          'Manual reconciliation of PaymentCheckout vs FulfillmentAttempt — do not auto-repair.',
        detail:
          'orderStatus FULFILLED but attempt 1 is missing or not SUCCEEDED.',
      });
    }
    if (o.status !== PAYMENT_CHECKOUT_STATUS.RECHARGE_COMPLETED) {
      issues.push({
        ...baseIssue(o, att ?? null),
        issueType: RECONCILIATION_ISSUE.PAYMENT_STATUS_MISMATCH,
        ageMs: null,
        anchor: null,
        recommendedAction:
          'Align legacy `status` with order lifecycle — manual review before updating rows.',
        detail: `orderStatus FULFILLED but payment checkout status is "${o.status}" (expected RECHARGE_COMPLETED).`,
      });
    }
  }

  const failedOrders = await prisma.paymentCheckout.findMany({
    where: { orderStatus: ORDER_STATUS.FAILED },
    include: {
      fulfillmentAttempts: { where: { attemptNumber: 1 } },
    },
  });

  for (const o of failedOrders) {
    const att = o.fulfillmentAttempts[0];
    if (att?.status === FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED) {
      issues.push({
        ...baseIssue(o, att),
        issueType: RECONCILIATION_ISSUE.FULFILLMENT_ORDER_MISMATCH,
        ageMs: null,
        anchor: null,
        recommendedAction:
          'Critical inconsistency — manual investigation; possible refund/chargeback implications.',
        detail: 'orderStatus FAILED but fulfillment attempt 1 is SUCCEEDED.',
      });
    }
  }

  const byIssueType = {};
  for (const row of issues) {
    const k = row.issueType;
    byIssueType[k] = (byIssueType[k] ?? 0) + 1;
  }

  return {
    scannedAt: now.toISOString(),
    thresholds: {
      paidStuckMs: t.paidStuckMs,
      processingStuckMs: t.processingStuckMs,
      fulfillmentQueuedStuckMs: t.fulfillmentQueuedStuckMs,
      fulfillmentProcessingStuckMs: t.fulfillmentProcessingStuckMs,
    },
    summary: {
      total: issues.length,
      byIssueType,
    },
    issues,
  };
}
