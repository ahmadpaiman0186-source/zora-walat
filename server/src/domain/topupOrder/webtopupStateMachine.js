import { PAYMENT_STATUS, FULFILLMENT_STATUS } from './statuses.js';

/**
 * Explicit WebTopupOrder lifecycle — payment vs fulfillment are orthogonal.
 * Authority distinguishes Stripe webhook (canonical capture) vs client mark-paid (optional env-gated).
 */

/** @typedef {'webhook' | 'client_mark_paid' | 'admin' | 'system'} PaymentTransitionAuthority */

const PAYMENT_EDGES = /** @type {Record<string, Set<string>>} */ ({
  [PAYMENT_STATUS.PENDING]: new Set([PAYMENT_STATUS.PAID, PAYMENT_STATUS.FAILED]),
  [PAYMENT_STATUS.PAID]: new Set([PAYMENT_STATUS.REFUNDED]),
  [PAYMENT_STATUS.FAILED]: new Set([]),
  [PAYMENT_STATUS.REFUNDED]: new Set([]),
});

const FULFILLMENT_EDGES = /** @type {Record<string, Set<string>>} */ ({
  [FULFILLMENT_STATUS.PENDING]: new Set([
    FULFILLMENT_STATUS.QUEUED,
    FULFILLMENT_STATUS.FAILED,
  ]),
  [FULFILLMENT_STATUS.QUEUED]: new Set([
    FULFILLMENT_STATUS.PROCESSING,
    FULFILLMENT_STATUS.FAILED,
  ]),
  [FULFILLMENT_STATUS.PROCESSING]: new Set([
    FULFILLMENT_STATUS.DELIVERED,
    FULFILLMENT_STATUS.FAILED,
    FULFILLMENT_STATUS.RETRYING,
  ]),
  [FULFILLMENT_STATUS.RETRYING]: new Set([
    FULFILLMENT_STATUS.PROCESSING,
    FULFILLMENT_STATUS.FAILED,
  ]),
  [FULFILLMENT_STATUS.DELIVERED]: new Set([]),
  [FULFILLMENT_STATUS.FAILED]: new Set([FULFILLMENT_STATUS.RETRYING]),
});

/**
 * @param {string} from
 * @param {string} to
 */
export function isAllowedWebTopupPaymentTransition(from, to) {
  return Boolean(PAYMENT_EDGES[from]?.has(to));
}

/**
 * @param {string} from
 * @param {string} to
 */
export function isAllowedWebTopupFulfillmentTransition(from, to) {
  return Boolean(FULFILLMENT_EDGES[from]?.has(to));
}

/**
 * @param {string} from
 * @param {string} to
 * @param {PaymentTransitionAuthority} authority
 */
export function assertWebTopupPaymentTransition(from, to, authority = 'system') {
  if (isAllowedWebTopupPaymentTransition(from, to)) {
    return { ok: true };
  }
  return {
    ok: false,
    reason: 'forbidden_payment_transition',
    from,
    to,
    authority,
  };
}

/**
 * @param {string} from
 * @param {string} to
 */
export function assertWebTopupFulfillmentTransition(from, to) {
  if (isAllowedWebTopupFulfillmentTransition(from, to)) {
    return { ok: true };
  }
  return {
    ok: false,
    reason: 'forbidden_fulfillment_transition',
    from,
    to,
  };
}
