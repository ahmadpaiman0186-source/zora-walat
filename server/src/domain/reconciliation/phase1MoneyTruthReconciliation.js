/**
 * Read-only reconciliation helpers: compare persisted Phase 1 rows **without** Stripe API calls.
 * Optional `stripeTruth` fields are for callers that already fetched Stripe state elsewhere.
 */

import { ORDER_STATUS } from '../../constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../../constants/paymentCheckoutStatus.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../../constants/fulfillmentAttemptStatus.js';
import { evaluatePhase1CompoundIntegrity } from '../orders/phase1TransactionStateMachine.js';

/**
 * @typedef {{
 *   paymentIntentIdMatchesCheckout?: boolean | null,
 *   paymentIntentStatus?: string | null,
 * }} StripeTruthSlice
 */

/**
 * Build a deterministic reconciliation snapshot for audits, ops dashboards, and workers.
 *
 * @param {import('@prisma/client').PaymentCheckout | Record<string, unknown>} order
 * @param {Array<Record<string, unknown>>} fulfillmentAttempts
 * @param {StripeTruthSlice} [stripeTruth]
 */
export function buildPhase1MoneyTruthSnapshot(order, fulfillmentAttempts, stripeTruth = {}) {
  /** @type {string[]} */
  const driftCodes = [];

  const compound = evaluatePhase1CompoundIntegrity(order, fulfillmentAttempts);
  for (const v of compound.violations) {
    driftCodes.push(`compound:${v}`);
  }

  const pi = order.stripePaymentIntentId != null ? String(order.stripePaymentIntentId) : '';
  const hasPi = pi.startsWith('pi_');
  const evt = order.completedByWebhookEventId != null ? String(order.completedByWebhookEventId) : '';
  const hasEvt = evt.startsWith('evt_');

  const paidLike =
    order.orderStatus === ORDER_STATUS.PAID ||
    order.orderStatus === ORDER_STATUS.PROCESSING ||
    order.orderStatus === ORDER_STATUS.FULFILLED;

  if (paidLike && !hasPi && !hasEvt) {
    driftCodes.push('paid_like_without_pi_or_completion_evt');
  }

  if (
    order.orderStatus === ORDER_STATUS.PAID &&
    order.status !== PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED
  ) {
    driftCodes.push('order_paid_payment_row_not_succeeded');
  }

  const succeededAttempt = (fulfillmentAttempts ?? []).some(
    (a) => String(a.status) === FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED,
  );
  if (order.orderStatus === ORDER_STATUS.FULFILLED && !succeededAttempt) {
    driftCodes.push('order_fulfilled_without_succeeded_attempt');
  }

  if (
    stripeTruth.paymentIntentIdMatchesCheckout === false
  ) {
    driftCodes.push('stripe_pi_mismatch');
  }

  if (
    typeof stripeTruth.paymentIntentStatus === 'string' &&
    stripeTruth.paymentIntentStatus.length > 0 &&
    paidLike &&
    !['succeeded', 'processing'].includes(String(stripeTruth.paymentIntentStatus).toLowerCase())
  ) {
    driftCodes.push('stripe_pi_not_paid_like_while_local_paid_like');
  }

  const aligned = driftCodes.length === 0;

  return {
    aligned,
    driftCodes,
    compoundOk: compound.ok,
    stripeTruthObserved: Boolean(
      stripeTruth &&
        (stripeTruth.paymentIntentIdMatchesCheckout != null ||
          stripeTruth.paymentIntentStatus != null),
    ),
  };
}
