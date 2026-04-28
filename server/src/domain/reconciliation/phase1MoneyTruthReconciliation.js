/**
 * Read-only reconciliation helpers: compare persisted Phase 1 rows **without** Stripe API calls.
 * Optional `stripeTruth` fields are for callers that already fetched Stripe state elsewhere.
 */

import { ORDER_STATUS } from '../../constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../../constants/paymentCheckoutStatus.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../../constants/fulfillmentAttemptStatus.js';
import { evaluatePhase1CompoundIntegrity } from '../orders/phase1TransactionStateMachine.js';

/**
 * Canonical drift codes emitted by `buildPhase1MoneyTruthSnapshot` / runner (audit/search keys).
 * `compound:*` entries append a suffix from `evaluatePhase1CompoundIntegrity`.
 */
export const PHASE1_RECONCILIATION_DRIFT_CODES = Object.freeze({
  __catalogVersion: 1,
  COMPOUND_PREFIX: 'compound:',
  PAID_LIKE_WITHOUT_PI_OR_EVT: 'paid_like_without_pi_or_completion_evt',
  ORDER_PAID_PAYMENT_ROW_NOT_SUCCEEDED: 'order_paid_payment_row_not_succeeded',
  ORDER_FULFILLED_WITHOUT_SUCCEEDED_ATTEMPT: 'order_fulfilled_without_succeeded_attempt',
  STRIPE_PI_MISMATCH: 'stripe_pi_mismatch',
  STRIPE_PI_NOT_PAID_LIKE_WHILE_LOCAL_PAID_LIKE:
    'stripe_pi_not_paid_like_while_local_paid_like',
});

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
    driftCodes.push(`${PHASE1_RECONCILIATION_DRIFT_CODES.COMPOUND_PREFIX}${v}`);
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
    driftCodes.push(PHASE1_RECONCILIATION_DRIFT_CODES.PAID_LIKE_WITHOUT_PI_OR_EVT);
  }

  if (
    order.orderStatus === ORDER_STATUS.PAID &&
    order.status !== PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED
  ) {
    driftCodes.push(PHASE1_RECONCILIATION_DRIFT_CODES.ORDER_PAID_PAYMENT_ROW_NOT_SUCCEEDED);
  }

  const succeededAttempt = (fulfillmentAttempts ?? []).some(
    (a) => String(a.status) === FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED,
  );
  if (order.orderStatus === ORDER_STATUS.FULFILLED && !succeededAttempt) {
    driftCodes.push(PHASE1_RECONCILIATION_DRIFT_CODES.ORDER_FULFILLED_WITHOUT_SUCCEEDED_ATTEMPT);
  }

  if (stripeTruth.paymentIntentIdMatchesCheckout === false) {
    driftCodes.push(PHASE1_RECONCILIATION_DRIFT_CODES.STRIPE_PI_MISMATCH);
  }

  if (
    typeof stripeTruth.paymentIntentStatus === 'string' &&
    stripeTruth.paymentIntentStatus.length > 0 &&
    paidLike &&
    !['succeeded', 'processing'].includes(String(stripeTruth.paymentIntentStatus).toLowerCase())
  ) {
    driftCodes.push(
      PHASE1_RECONCILIATION_DRIFT_CODES.STRIPE_PI_NOT_PAID_LIKE_WHILE_LOCAL_PAID_LIKE,
    );
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
