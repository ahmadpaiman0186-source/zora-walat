import { ORDER_STATUS } from '../../constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../../constants/paymentCheckoutStatus.js';
import {
  canTransition,
  isTerminalOrderStatus,
} from './orderLifecycle.js';

/** Non-throwing denial codes for APIs, logs, and canonical truth. */
export const LIFECYCLE_DENIAL_CODE = Object.freeze({
  ORDER_TRANSITION_NOT_ALLOWED: 'ORDER_TRANSITION_NOT_ALLOWED',
  ORDER_TERMINAL_IMMUTABLE: 'ORDER_TERMINAL_IMMUTABLE',
  ORDER_STATUS_NOOP: 'ORDER_STATUS_NOOP',
  PAYMENT_STATUS_TRANSITION_NOT_ALLOWED: 'PAYMENT_STATUS_TRANSITION_NOT_ALLOWED',
  PAYMENT_STATUS_NOOP: 'PAYMENT_STATUS_NOOP',
});

/**
 * @param {string | null | undefined} from
 * @param {string | null | undefined} to
 * @returns {{ ok: true, noop?: boolean } | { ok: false, denial: string, detail?: string }}
 */
export function validateOrderStatusTransition(from, to) {
  const f = from != null ? String(from) : '';
  const t = to != null ? String(to) : '';
  if (f === t) {
    return { ok: true, noop: true };
  }
  if (!f || !t) {
    return {
      ok: false,
      denial: LIFECYCLE_DENIAL_CODE.ORDER_TRANSITION_NOT_ALLOWED,
      detail: 'missing_from_or_to',
    };
  }
  if (isTerminalOrderStatus(f)) {
    return {
      ok: false,
      denial: LIFECYCLE_DENIAL_CODE.ORDER_TERMINAL_IMMUTABLE,
      detail: f,
    };
  }
  if (!canTransition(f, t)) {
    return {
      ok: false,
      denial: LIFECYCLE_DENIAL_CODE.ORDER_TRANSITION_NOT_ALLOWED,
      detail: `${f}->${t}`,
    };
  }
  return { ok: true };
}

/**
 * Expected `PaymentCheckout.status` (payment / recharge row) for a canonical order lifecycle.
 * Used for corruption / manual-edit detection — not for optimistic concurrency versioning.
 *
 * @param {import('@prisma/client').PaymentCheckout | Record<string, unknown>} row
 * @returns {{ code: string, orderStatus: string, paymentStatus: string }[]}
 */
export function detectPhase1LifecycleIncoherence(row) {
  /** @type {{ code: string, orderStatus: string, paymentStatus: string }[]} */
  const violations = [];
  const os = row.orderStatus != null ? String(row.orderStatus) : '';
  const ps = row.status != null ? String(row.status) : '';
  if (!os || !ps) {
    violations.push({
      code: 'MISSING_STATUS_FIELDS',
      orderStatus: os,
      paymentStatus: ps,
    });
    return violations;
  }

  if (os === ORDER_STATUS.PENDING) {
    const ok = new Set([
      PAYMENT_CHECKOUT_STATUS.INITIATED,
      PAYMENT_CHECKOUT_STATUS.CHECKOUT_CREATED,
      PAYMENT_CHECKOUT_STATUS.PAYMENT_PENDING,
      PAYMENT_CHECKOUT_STATUS.PAYMENT_FAILED,
    ]);
    if (!ok.has(ps)) {
      violations.push({
        code: 'PENDING_INCONSISTENT_PAYMENT_ROW',
        orderStatus: os,
        paymentStatus: ps,
      });
    }
  } else if (os === ORDER_STATUS.PAID) {
    if (ps !== PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED) {
      violations.push({
        code: 'PAID_REQUIRES_PAYMENT_SUCCEEDED',
        orderStatus: os,
        paymentStatus: ps,
      });
    }
  } else if (os === ORDER_STATUS.PROCESSING) {
    if (ps !== PAYMENT_CHECKOUT_STATUS.RECHARGE_PENDING) {
      violations.push({
        code: 'PROCESSING_EXPECTS_RECHARGE_PENDING',
        orderStatus: os,
        paymentStatus: ps,
      });
    }
  } else if (os === ORDER_STATUS.FULFILLED) {
    if (ps !== PAYMENT_CHECKOUT_STATUS.RECHARGE_COMPLETED) {
      violations.push({
        code: 'FULFILLED_REQUIRES_RECHARGE_COMPLETED',
        orderStatus: os,
        paymentStatus: ps,
      });
    }
  } else if (os === ORDER_STATUS.FAILED) {
    const ok = new Set([
      PAYMENT_CHECKOUT_STATUS.PAYMENT_FAILED,
      PAYMENT_CHECKOUT_STATUS.RECHARGE_FAILED,
    ]);
    if (!ok.has(ps)) {
      violations.push({
        code: 'FAILED_EXPECTS_TERMINAL_PAYMENT_ROW',
        orderStatus: os,
        paymentStatus: ps,
      });
    }
  } else if (os === ORDER_STATUS.CANCELLED) {
    if (ps !== PAYMENT_CHECKOUT_STATUS.PAYMENT_FAILED) {
      violations.push({
        code: 'CANCELLED_EXPECTS_PAYMENT_FAILED',
        orderStatus: os,
        paymentStatus: ps,
      });
    }
  }

  return violations;
}

/**
 * Non-throwing payment-row transition check (mirrors `validateOrderStatusTransition`).
 *
 * @param {string | null | undefined} from
 * @param {string | null | undefined} to
 * @returns {{ ok: true, noop?: boolean } | { ok: false, denial: string, detail?: string }}
 */
export function validatePaymentCheckoutStatusTransition(from, to) {
  const f = from != null ? String(from) : '';
  const t = to != null ? String(to) : '';
  if (f === t) {
    return { ok: true, noop: true };
  }
  if (!f || !t) {
    return {
      ok: false,
      denial: LIFECYCLE_DENIAL_CODE.PAYMENT_STATUS_TRANSITION_NOT_ALLOWED,
      detail: 'missing_from_or_to',
    };
  }
  if (!canPaymentCheckoutStatusTransition(f, t)) {
    return {
      ok: false,
      denial: LIFECYCLE_DENIAL_CODE.PAYMENT_STATUS_TRANSITION_NOT_ALLOWED,
      detail: `${f}->${t}`,
    };
  }
  return { ok: true };
}

/**
 * @param {string | null | undefined} from
 * @param {string | null | undefined} to
 */
export function canPaymentCheckoutStatusTransition(from, to) {
  const f = from != null ? String(from) : '';
  const t = to != null ? String(to) : '';
  if (f === t) return true;
  /** @type {Map<string, Set<string>>} */
  const edges = new Map([
    [
      PAYMENT_CHECKOUT_STATUS.INITIATED,
      new Set([
        PAYMENT_CHECKOUT_STATUS.CHECKOUT_CREATED,
        /** Stripe `checkout.session.completed` may land before intermediate rows persist. */
        PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
        PAYMENT_CHECKOUT_STATUS.PAYMENT_FAILED,
      ]),
    ],
    [
      PAYMENT_CHECKOUT_STATUS.CHECKOUT_CREATED,
      new Set([
        PAYMENT_CHECKOUT_STATUS.PAYMENT_PENDING,
        PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
        PAYMENT_CHECKOUT_STATUS.PAYMENT_FAILED,
      ]),
    ],
    [
      PAYMENT_CHECKOUT_STATUS.PAYMENT_PENDING,
      new Set([
        PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
        PAYMENT_CHECKOUT_STATUS.PAYMENT_FAILED,
      ]),
    ],
    [
      PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
      new Set([PAYMENT_CHECKOUT_STATUS.RECHARGE_PENDING]),
    ],
    [
      PAYMENT_CHECKOUT_STATUS.RECHARGE_PENDING,
      new Set([
        PAYMENT_CHECKOUT_STATUS.RECHARGE_COMPLETED,
        PAYMENT_CHECKOUT_STATUS.RECHARGE_FAILED,
      ]),
    ],
  ]);
  return Boolean(edges.get(f)?.has(t));
}
