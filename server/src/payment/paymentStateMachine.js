/**
 * Layer 3 — canonical payment core states (logical view over `PaymentCheckout`).
 * Aligns with persisted `orderStatus` + `status`; enforces forward-only transitions.
 * `PAYMENT_PENDING → PAID` is **Stripe webhook–authority only** (no API shortcut).
 */

import { ORDER_STATUS } from '../constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../constants/paymentCheckoutStatus.js';
import { POST_PAYMENT_INCIDENT_STATUS } from '../constants/postPaymentIncidentStatus.js';

/** @typedef {'INIT'|'PAYMENT_PENDING'|'PAID'|'FULFILLMENT_QUEUED'|'FULFILLED'|'FAILED'|'REFUNDED'|'DISPUTED'} PaymentCoreState */

export const PAYMENT_CORE_STATE = Object.freeze({
  INIT: 'INIT',
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  PAID: 'PAID',
  FULFILLMENT_QUEUED: 'FULFILLMENT_QUEUED',
  FULFILLED: 'FULFILLED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
  DISPUTED: 'DISPUTED',
});

const S = PAYMENT_CORE_STATE;

const TERMINAL = new Set([
  S.FULFILLED,
  S.FAILED,
  S.REFUNDED,
  S.DISPUTED,
]);

/** @type {Map<string, Set<string>>} */
const EDGES = new Map([
  /** API may advance INIT → PAYMENT_PENDING when Stripe session is created (not used by webhooks). */
  [S.INIT, new Set([S.PAYMENT_PENDING, S.FAILED])],
  [S.PAYMENT_PENDING, new Set([S.PAID, S.FAILED])],
  [S.PAID, new Set([S.FULFILLMENT_QUEUED, S.FAILED, S.REFUNDED, S.DISPUTED])],
  [S.FULFILLMENT_QUEUED, new Set([S.FULFILLED, S.FAILED])],
]);

const WEBHOOK_ONLY_TO_PAID_FROM = new Set([S.PAYMENT_PENDING]);

/**
 * Map persisted checkout row → logical Layer 3 state.
 * @param {import('@prisma/client').PaymentCheckout | Record<string, unknown>} row
 * @returns {PaymentCoreState}
 */
export function paymentCheckoutRowToL3State(row) {
  const inc = row.postPaymentIncidentStatus;
  if (inc === POST_PAYMENT_INCIDENT_STATUS.REFUNDED) return S.REFUNDED;
  if (
    inc === POST_PAYMENT_INCIDENT_STATUS.DISPUTED ||
    inc === POST_PAYMENT_INCIDENT_STATUS.CHARGEBACK_LOST
  ) {
    return S.DISPUTED;
  }

  const os = String(row.orderStatus ?? '');
  const ps = String(row.status ?? '');

  if (
    os === ORDER_STATUS.FAILED ||
    ps === PAYMENT_CHECKOUT_STATUS.PAYMENT_FAILED ||
    ps === PAYMENT_CHECKOUT_STATUS.RECHARGE_FAILED
  ) {
    return S.FAILED;
  }
  if (os === ORDER_STATUS.FULFILLED && ps === PAYMENT_CHECKOUT_STATUS.RECHARGE_COMPLETED) {
    return S.FULFILLED;
  }
  if (os === ORDER_STATUS.PROCESSING && ps === PAYMENT_CHECKOUT_STATUS.RECHARGE_PENDING) {
    return S.FULFILLMENT_QUEUED;
  }
  if (os === ORDER_STATUS.PAID && ps === PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED) {
    return S.PAID;
  }
  if (os === ORDER_STATUS.PENDING) {
    if (
      ps === PAYMENT_CHECKOUT_STATUS.INITIATED ||
      ps === PAYMENT_CHECKOUT_STATUS.CHECKOUT_CREATED ||
      ps === PAYMENT_CHECKOUT_STATUS.PAYMENT_PENDING
    ) {
      /** INITIATED rows may receive `checkout.session.completed` in tests / rare races before CHECKOUT_CREATED is persisted. */
      return S.PAYMENT_PENDING;
    }
  }
  return S.FAILED;
}

/**
 * @param {PaymentCoreState} state
 */
export function isTerminalState(state) {
  return TERMINAL.has(state);
}

/**
 * @param {PaymentCoreState} state
 * @returns {PaymentCoreState[]}
 */
export function getNextAllowedStates(state) {
  const n = EDGES.get(state);
  return n ? [...n] : [];
}

/**
 * @param {PaymentCoreState} from
 * @param {PaymentCoreState} to
 * @param {{ authority?: 'stripe_webhook' | 'api' | 'system' }} [opts]
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function assertValidTransition(from, to, opts = {}) {
  if (from === to) {
    return { ok: false, reason: 'noop_same_state' };
  }
  if (TERMINAL.has(from)) {
    return { ok: false, reason: 'from_terminal' };
  }
  const allowed = EDGES.get(from);
  if (!allowed?.has(to)) {
    return { ok: false, reason: 'edge_not_allowed' };
  }
  if (to === S.PAID && WEBHOOK_ONLY_TO_PAID_FROM.has(from)) {
    if (opts.authority !== 'stripe_webhook') {
      return { ok: false, reason: 'paid_requires_stripe_webhook_authority' };
    }
  }
  return { ok: true };
}

/**
 * Webhook path: validate logical transition into PAID before persisting paid transition.
 * @param {import('@prisma/client').PaymentCheckout | Record<string, unknown>} row
 * @returns {{ ok: true, from: PaymentCoreState } | { ok: false, from: PaymentCoreState, reason: string }}
 */
export function validateLayer3WebPaidTransition(row) {
  const from = paymentCheckoutRowToL3State(row);
  const r = assertValidTransition(from, S.PAID, { authority: 'stripe_webhook' });
  if (!r.ok) return { ok: false, from, reason: r.reason };
  return { ok: true, from };
}
