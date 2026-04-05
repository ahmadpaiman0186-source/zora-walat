import { ORDER_STATUS } from '../constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../constants/paymentCheckoutStatus.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../constants/fulfillmentAttemptStatus.js';
import { RECONCILIATION_ISSUE } from '../constants/reconciliationIssue.js';

/**
 * Apply stuck / mismatch rules for a single PaymentCheckout row (read-only).
 * @param {import('@prisma/client').PaymentCheckout & { fulfillmentAttempts?: import('@prisma/client').FulfillmentAttempt[] }} o
 * @param {object[]} issues
 * @param {{
 *   now: Date,
 *   t: { paidStuckMs: number, processingStuckMs: number, fulfillmentQueuedStuckMs: number, fulfillmentProcessingStuckMs: number },
 *   paidCutoff: Date,
 *   processingCutoff: Date,
 *   queuedCutoff: Date,
 *   attemptProcessingCutoff: Date,
 *   baseIssue: (order: unknown, attempt: unknown) => object,
 *   msSince: (d: Date | null | undefined) => number | null,
 *   dupFilter?: Set<string>,
 * }} ctx
 */
export function evaluateCheckoutReconciliation(o, issues, ctx) {
  const att1 =
    o.fulfillmentAttempts?.find((a) => a.attemptNumber === 1) ??
    o.fulfillmentAttempts?.[0] ??
    null;

  const dupKey = (type) => `${o.id}:${type}`;
  const skipDup = ctx.dupFilter;
  const add = (row) => {
    if (skipDup) {
      const k = dupKey(row.issueType);
      if (skipDup.has(k)) return;
      skipDup.add(k);
    }
    issues.push(row);
  };

  if (o.orderStatus === ORDER_STATUS.PAID) {
    if (!att1) {
      add({
        ...ctx.baseIssue(o, null),
        issueType: RECONCILIATION_ISSUE.PAID_WITHOUT_ATTEMPT,
        ageMs: ctx.msSince(o.paidAt),
        anchor: 'paidAt',
        recommendedAction:
          'Investigate webhook / ensureQueuedFulfillmentAttempt; data may be inconsistent — manual DB review before any fix.',
        detail: 'PAID order has no fulfillment attempt row (attempt 1 missing).',
      });
      return;
    }
    if (o.paidAt && new Date(o.paidAt) <= ctx.paidCutoff) {
      add({
        ...ctx.baseIssue(o, att1),
        issueType: RECONCILIATION_ISSUE.ORDER_PAID_STUCK,
        ageMs: ctx.msSince(o.paidAt),
        anchor: 'paidAt',
        recommendedAction:
          'Check fulfillment drain / scheduleFulfillmentProcessing; verify workers and logs — manual processFulfillmentForOrder only after review.',
        detail:
          'Order remains PAID beyond threshold (fulfillment not claimed or processing not started).',
      });
      return;
    }
    if (
      att1.status === FULFILLMENT_ATTEMPT_STATUS.QUEUED &&
      new Date(att1.createdAt) <= ctx.queuedCutoff
    ) {
      add({
        ...ctx.baseIssue(o, att1),
        issueType: RECONCILIATION_ISSUE.FULFILLMENT_QUEUED_STUCK,
        ageMs: ctx.msSince(att1.createdAt),
        anchor: 'attempt.createdAt',
        recommendedAction:
          'Confirm drain interval and worker health; inspect why QUEUED was not claimed.',
        detail: 'Fulfillment attempt 1 still QUEUED beyond threshold.',
      });
    }
    return;
  }

  if (o.orderStatus === ORDER_STATUS.PROCESSING) {
    if (!att1) {
      add({
        ...ctx.baseIssue(o, null),
        issueType: RECONCILIATION_ISSUE.FULFILLMENT_ORDER_MISMATCH,
        ageMs: null,
        anchor: null,
        recommendedAction:
          'Manual data review — PROCESSING without fulfillment attempt is invalid.',
        detail: 'orderStatus PROCESSING but fulfillment attempt 1 is missing.',
      });
      return;
    }
    const anchor = att1.startedAt ?? att1.updatedAt ?? o.updatedAt;
    if (!anchor) return;
    if (new Date(anchor) > ctx.processingCutoff) return;
    add({
      ...ctx.baseIssue(o, att1),
      issueType: RECONCILIATION_ISSUE.ORDER_PROCESSING_STUCK,
      ageMs: ctx.msSince(anchor),
      anchor: att1.startedAt ? 'attempt.startedAt' : 'order.updatedAt',
      recommendedAction:
        'Check provider timeouts and logs; possible hung provider call — manual investigation; no automatic rollback.',
      detail: 'Order PROCESSING beyond threshold (provider or completion phase may be stuck).',
    });
    return;
  }

  if (o.orderStatus === ORDER_STATUS.FULFILLED) {
    if (!att1 || att1.status !== FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED) {
      add({
        ...ctx.baseIssue(o, att1 ?? null),
        issueType: RECONCILIATION_ISSUE.FULFILLMENT_ORDER_MISMATCH,
        ageMs: null,
        anchor: null,
        recommendedAction:
          'Manual reconciliation of PaymentCheckout vs FulfillmentAttempt — do not auto-repair.',
        detail: 'orderStatus FULFILLED but attempt 1 is missing or not SUCCEEDED.',
      });
    }
    if (o.status !== PAYMENT_CHECKOUT_STATUS.RECHARGE_COMPLETED) {
      add({
        ...ctx.baseIssue(o, att1 ?? null),
        issueType: RECONCILIATION_ISSUE.PAYMENT_STATUS_MISMATCH,
        ageMs: null,
        anchor: null,
        recommendedAction:
          'Align legacy `status` with order lifecycle — manual review before updating rows.',
        detail: `orderStatus FULFILLED but payment checkout status is "${o.status}" (expected RECHARGE_COMPLETED).`,
      });
    }
    return;
  }

  if (o.orderStatus === ORDER_STATUS.FAILED) {
    if (att1?.status === FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED) {
      add({
        ...ctx.baseIssue(o, att1),
        issueType: RECONCILIATION_ISSUE.FULFILLMENT_ORDER_MISMATCH,
        ageMs: null,
        anchor: null,
        recommendedAction:
          'Critical inconsistency — manual investigation; possible refund/chargeback implications.',
        detail: 'orderStatus FAILED but fulfillment attempt 1 is SUCCEEDED.',
      });
    }
  }
}
