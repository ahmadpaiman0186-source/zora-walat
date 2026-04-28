/**
 * Phase 1 transaction state machine — PaymentCheckout + primary fulfillment attempt.
 *
 * Text diagram ( happy path ):
 *
 *   [PENDING + INITIATED…CHECKOUT_CREATED…PAYMENT_PENDING]
 *        │  Stripe checkout.session.completed + integrity OK
 *        ▼
 *   [PAID + PAYMENT_SUCCEEDED] ──ensureQueuedFulfillmentAttempt──► attempt #1 QUEUED
 *        │
 *        │  worker claim
 *        ▼
 *   [PROCESSING + RECHARGE_PENDING] ──provider adapter──► attempt PROCESSING → SUCCEEDED | FAILED
 *        │
 *        └──────────────────────────────► [FULFILLED] | [FAILED] | [CANCELLED from PENDING only]
 *
 * Hard rules enforced here:
 * - No fulfillment queue row may be created unless the order is already PAID with server-confirmed payment.
 * - Compound integrity checks catch impossible rows (e.g. queued attempt while order still PENDING).
 */

import { ORDER_STATUS } from '../../constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../../constants/paymentCheckoutStatus.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../../constants/fulfillmentAttemptStatus.js';
import { canOrderProceedToFulfillment } from '../../lib/phase1FulfillmentPaymentGate.js';
import { assertTransition, canTransition } from './orderLifecycle.js';
import { canPaymentCheckoutStatusTransition } from './phase1LifecyclePolicy.js';

/**
 * Preconditions for creating fulfillment attempt #1 inside the payment webhook transaction.
 *
 * @param {import('@prisma/client').PaymentCheckout | Record<string, unknown> | null | undefined} order
 * @returns {{ ok: true } | { ok: false, reason: string, detail?: string | null }}
 */
export function assertPhase1FulfillmentQueuePreconditions(order) {
  if (!order || typeof order !== 'object') {
    return { ok: false, reason: 'missing_order' };
  }

  if (order.orderStatus !== ORDER_STATUS.PAID) {
    return {
      ok: false,
      reason: 'order_not_paid',
      detail:
        order.orderStatus != null ? String(order.orderStatus) : null,
    };
  }

  const gate = canOrderProceedToFulfillment(order, { lifecycle: 'PAID_ONLY' });
  if (!gate.ok) {
    return {
      ok: false,
      reason: gate.denial,
      detail: gate.detail ?? null,
    };
  }

  return { ok: true };
}

/**
 * Validates order lifecycle edges only (PaymentCheckout.orderStatus).
 *
 * @param {string | null | undefined} from
 * @param {string | null | undefined} to
 */
export function assertPhase1OrderLifecycleTransition(from, to) {
  assertTransition(from, to);
}

/**
 * @param {string | null | undefined} from
 * @param {string | null | undefined} to
 */
export function canPhase1OrderLifecycleTransition(from, to) {
  return canTransition(from, to);
}

/**
 * @param {string | null | undefined} from
 * @param {string | null | undefined} to
 */
export function canPhase1PaymentRowTransition(from, to) {
  return canPaymentCheckoutStatusTransition(from, to);
}

const NON_TERMINAL_ATTEMPT = new Set([
  FULFILLMENT_ATTEMPT_STATUS.QUEUED,
  FULFILLMENT_ATTEMPT_STATUS.PROCESSING,
]);

/**
 * Impossible or high-risk compound states (drift / abuse / bug detection).
 * Does not call providers or Stripe.
 *
 * @param {import('@prisma/client').PaymentCheckout | Record<string, unknown>} order
 * @param {Array<{ status?: string | null, attemptNumber?: number }>} fulfillmentAttempts
 * @returns {{ ok: boolean, violations: string[] }}
 */
export function evaluatePhase1CompoundIntegrity(order, fulfillmentAttempts) {
  /** @type {string[]} */
  const violations = [];
  const os = order.orderStatus != null ? String(order.orderStatus) : '';
  const ps = order.status != null ? String(order.status) : '';

  const attemptOne = (fulfillmentAttempts ?? []).find(
    (a) => Number(a.attemptNumber) === 1,
  );
  const a1s = attemptOne?.status != null ? String(attemptOne.status) : null;

  if (a1s && NON_TERMINAL_ATTEMPT.has(a1s)) {
    if (os === ORDER_STATUS.PENDING) {
      violations.push('fulfillment_active_before_order_paid');
    }
    if (ps !== PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED && ps !== PAYMENT_CHECKOUT_STATUS.RECHARGE_PENDING) {
      violations.push('fulfillment_active_without_payment_terminal_success_row');
    }
  }

  if (
    (os === ORDER_STATUS.PROCESSING || os === ORDER_STATUS.FULFILLED) &&
    os !== ORDER_STATUS.PENDING &&
    ps === PAYMENT_CHECKOUT_STATUS.PAYMENT_FAILED
  ) {
    violations.push('order_forward_payment_row_failed');
  }

  if (os === ORDER_STATUS.PAID && ps === PAYMENT_CHECKOUT_STATUS.PAYMENT_FAILED) {
    violations.push('paid_order_with_failed_payment_row');
  }

  return { ok: violations.length === 0, violations };
}

/**
 * Human-readable list of implemented **order** transitions (for docs/tests).
 */
export function listPhase1OrderLifecycleEdges() {
  return [
    'PENDING → PAID | FAILED | CANCELLED',
    'PAID → PROCESSING | FAILED',
    'PROCESSING → FULFILLED | FAILED | PAID (recovery)',
  ];
}
