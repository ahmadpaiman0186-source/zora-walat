import { ORDER_STATUS } from '../constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../constants/paymentCheckoutStatus.js';
import { POST_PAYMENT_INCIDENT_STATUS } from '../constants/postPaymentIncidentStatus.js';
import { PRODUCT_TYPES } from '../domain/pricing/productTypes.js';

/** Stable denial codes for logs, support traces, and HTTP 409 payloads. */
export const FULFILLMENT_GATE_DENIAL = Object.freeze({
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  NOT_PHASE1_PRODUCT: 'NOT_PHASE1_PRODUCT',
  CURRENCY_NOT_USD: 'CURRENCY_NOT_USD',
  AMOUNT_INVALID: 'AMOUNT_INVALID',
  ORDER_TERMINAL: 'ORDER_TERMINAL',
  PAYMENT_NOT_SERVER_CONFIRMED: 'PAYMENT_NOT_SERVER_CONFIRMED',
  /** PAID-only worker claim, or PAID/PROCESSING client kick, rejected. */
  ORDER_LIFECYCLE_NOT_ELIGIBLE: 'ORDER_LIFECYCLE_NOT_ELIGIBLE',
  MISSING_PAYMENT_CORRELATION: 'MISSING_PAYMENT_CORRELATION',
  POST_PAYMENT_INCIDENT_BLOCKS: 'POST_PAYMENT_INCIDENT_BLOCKS',
});

/**
 * Single authoritative gate: no provider I/O unless the server has recorded
 * Stripe Checkout success (`PAYMENT_SUCCEEDED`) and basic money integrity holds.
 * Client "belief" (return URL, app state) is irrelevant.
 *
 * @param {import('@prisma/client').PaymentCheckout | Record<string, unknown> | null | undefined} order
 * @param {{ lifecycle?: 'PAID_ONLY' | 'PAID_OR_PROCESSING' }} [opts]
 * @returns {{ ok: true } | { ok: false, denial: string, detail?: string | null }}
 */
export function canOrderProceedToFulfillment(order, opts = {}) {
  const lifecycleMode = opts.lifecycle ?? 'PAID_ONLY';

  if (!order || typeof order !== 'object') {
    return { ok: false, denial: FULFILLMENT_GATE_DENIAL.ORDER_NOT_FOUND };
  }

  const pt = order.productType || PRODUCT_TYPES.MOBILE_TOPUP;
  if (pt !== PRODUCT_TYPES.MOBILE_TOPUP) {
    return {
      ok: false,
      denial: FULFILLMENT_GATE_DENIAL.NOT_PHASE1_PRODUCT,
      detail: String(pt),
    };
  }

  if (order.currency && String(order.currency).toLowerCase() !== 'usd') {
    return {
      ok: false,
      denial: FULFILLMENT_GATE_DENIAL.CURRENCY_NOT_USD,
      detail: String(order.currency),
    };
  }

  const cents = Number(order.amountUsdCents);
  if (!Number.isFinite(cents) || cents <= 0) {
    return { ok: false, denial: FULFILLMENT_GATE_DENIAL.AMOUNT_INVALID };
  }

  const os = order.orderStatus;
  if (
    os === ORDER_STATUS.FULFILLED ||
    os === ORDER_STATUS.FAILED ||
    os === ORDER_STATUS.CANCELLED
  ) {
    return {
      ok: false,
      denial: FULFILLMENT_GATE_DENIAL.ORDER_TERMINAL,
      detail: String(os),
    };
  }

  /** Server-authoritative: checkout.session.completed path sets this — not client. */
  if (order.status !== PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED) {
    return {
      ok: false,
      denial: FULFILLMENT_GATE_DENIAL.PAYMENT_NOT_SERVER_CONFIRMED,
      detail: order.status != null ? String(order.status) : null,
    };
  }

  const piRaw = order.stripePaymentIntentId;
  const hasPi =
    typeof piRaw === 'string' &&
    piRaw.trim().startsWith('pi_');
  const whRaw = order.completedByWebhookEventId;
  const hasCompletedEvent =
    typeof whRaw === 'string' && whRaw.trim().startsWith('evt_');
  if (!hasPi && !hasCompletedEvent) {
    return { ok: false, denial: FULFILLMENT_GATE_DENIAL.MISSING_PAYMENT_CORRELATION };
  }

  if (lifecycleMode === 'PAID_ONLY') {
    if (os !== ORDER_STATUS.PAID) {
      return {
        ok: false,
        denial: FULFILLMENT_GATE_DENIAL.ORDER_LIFECYCLE_NOT_ELIGIBLE,
        detail: String(os),
      };
    }
  } else {
    if (os !== ORDER_STATUS.PAID && os !== ORDER_STATUS.PROCESSING) {
      return {
        ok: false,
        denial: FULFILLMENT_GATE_DENIAL.ORDER_LIFECYCLE_NOT_ELIGIBLE,
        detail: String(os),
      };
    }
  }

  const inc = order.postPaymentIncidentStatus;
  if (
    inc === POST_PAYMENT_INCIDENT_STATUS.REFUNDED ||
    inc === POST_PAYMENT_INCIDENT_STATUS.DISPUTED ||
    inc === POST_PAYMENT_INCIDENT_STATUS.CHARGEBACK_LOST
  ) {
    return {
      ok: false,
      denial: FULFILLMENT_GATE_DENIAL.POST_PAYMENT_INCIDENT_BLOCKS,
      detail: String(inc),
    };
  }

  return { ok: true };
}
