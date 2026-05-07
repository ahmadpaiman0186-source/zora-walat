/**
 * Layer 5 — Stripe webhook payment truth (checkout.session.completed).
 * Single SoT: signed webhook + session payload vs `PaymentCheckout` row.
 * Does not perform signature verification (raw body + constructEvent stays in route).
 */

import { ORDER_STATUS } from '../constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../constants/paymentCheckoutStatus.js';
import { isLikelyPaymentCheckoutId } from '../lib/paymentCheckoutId.js';
import { evaluateStripeCheckoutSessionRowIntegrity } from '../lib/paymentCompletionLinkage.js';
import { isTerminalOrderStatus } from '../domain/orders/orderLifecycle.js';

/** @typedef {'missing_internal_checkout_id'|'order_not_found'|'amount_mismatch'|'currency_mismatch'|'unpaid_session'|'duplicate_event'|'terminal_conflict'|'unsupported_event_type'|'stripe_session_mismatch'} WebhookPaymentTruthFailureClass */

export const WEBHOOK_PAYMENT_TRUTH_FAILURE = Object.freeze({
  MISSING_INTERNAL_CHECKOUT_ID: 'missing_internal_checkout_id',
  ORDER_NOT_FOUND: 'order_not_found',
  AMOUNT_MISMATCH: 'amount_mismatch',
  CURRENCY_MISMATCH: 'currency_mismatch',
  UNPAID_SESSION: 'unpaid_session',
  DUPLICATE_EVENT: 'duplicate_event',
  TERMINAL_CONFLICT: 'terminal_conflict',
  UNSUPPORTED_EVENT_TYPE: 'unsupported_event_type',
  STRIPE_SESSION_MISMATCH: 'stripe_session_mismatch',
});

const CHECKOUT_SESSION_COMPLETED = 'checkout.session.completed';

/**
 * @param {WebhookPaymentTruthFailureClass} reason
 * @returns {{ severity: 'info'|'warn'|'error', manualReview: boolean, httpAck: '200'|'400' }}
 */
export function classifyWebhookPaymentTruthFailure(reason) {
  switch (reason) {
    case WEBHOOK_PAYMENT_TRUTH_FAILURE.DUPLICATE_EVENT:
      return { severity: 'info', manualReview: false, httpAck: '200' };
    case WEBHOOK_PAYMENT_TRUTH_FAILURE.MISSING_INTERNAL_CHECKOUT_ID:
    case WEBHOOK_PAYMENT_TRUTH_FAILURE.ORDER_NOT_FOUND:
      return { severity: 'warn', manualReview: false, httpAck: '200' };
    case WEBHOOK_PAYMENT_TRUTH_FAILURE.UNSUPPORTED_EVENT_TYPE:
      return { severity: 'info', manualReview: false, httpAck: '200' };
    case WEBHOOK_PAYMENT_TRUTH_FAILURE.UNPAID_SESSION:
      return { severity: 'warn', manualReview: true, httpAck: '200' };
    case WEBHOOK_PAYMENT_TRUTH_FAILURE.AMOUNT_MISMATCH:
    case WEBHOOK_PAYMENT_TRUTH_FAILURE.CURRENCY_MISMATCH:
    case WEBHOOK_PAYMENT_TRUTH_FAILURE.STRIPE_SESSION_MISMATCH:
    case WEBHOOK_PAYMENT_TRUTH_FAILURE.TERMINAL_CONFLICT:
      return { severity: 'error', manualReview: true, httpAck: '200' };
    default:
      return { severity: 'warn', manualReview: true, httpAck: '200' };
  }
}

/**
 * @param {{ session: Record<string, unknown>, order: Record<string, unknown> }}
 * @returns {{ ok: true } | { ok: false, failureClass: typeof WEBHOOK_PAYMENT_TRUTH_FAILURE[keyof typeof WEBHOOK_PAYMENT_TRUTH_FAILURE], detail?: string }}
 */
export function assertWebhookAmountCurrencyMatch({ session, order }) {
  const total = session.amount_total;
  const sessionCurrency = String(session.currency ?? 'usd').toLowerCase();
  const rowCurrency = String(order.currency ?? 'usd').toLowerCase();
  if (total == null) {
    return {
      ok: false,
      failureClass: WEBHOOK_PAYMENT_TRUTH_FAILURE.AMOUNT_MISMATCH,
      detail: 'missing_amount_total',
    };
  }
  if (total !== order.amountUsdCents) {
    return {
      ok: false,
      failureClass: WEBHOOK_PAYMENT_TRUTH_FAILURE.AMOUNT_MISMATCH,
      detail: 'amount_total_mismatch',
    };
  }
  if (sessionCurrency !== rowCurrency) {
    return {
      ok: false,
      failureClass: WEBHOOK_PAYMENT_TRUTH_FAILURE.CURRENCY_MISMATCH,
      detail: 'currency_mismatch',
    };
  }
  return { ok: true };
}

/**
 * @param {{
 *   session: Record<string, unknown>,
 *   order: import('@prisma/client').PaymentCheckout | Record<string, unknown> | null,
 *   stripeEventType: string,
 *   traceId?: string | null,
 * }} p
 * @returns {{
 *   ok: boolean,
 *   failureClass?: WebhookPaymentTruthFailureClass,
 *   manualReview?: boolean,
 *   audit: Record<string, unknown>,
 *   stripeSessionId?: string,
 * }}
 */
export function validateStripeCheckoutSessionTruth(p) {
  const { session, order, stripeEventType, traceId } = p;
  const baseAudit = buildWebhookTruthAuditPayload({
    session,
    order,
    traceId,
    stripeEventType,
  });

  if (stripeEventType !== CHECKOUT_SESSION_COMPLETED) {
    return {
      ok: false,
      failureClass: WEBHOOK_PAYMENT_TRUTH_FAILURE.UNSUPPORTED_EVENT_TYPE,
      audit: { ...baseAudit, validated: false },
    };
  }

  if (!session || typeof session !== 'object') {
    return {
      ok: false,
      failureClass: WEBHOOK_PAYMENT_TRUTH_FAILURE.UNSUPPORTED_EVENT_TYPE,
      audit: { ...baseAudit, validated: false },
    };
  }

  const meta =
    session.metadata && typeof session.metadata === 'object'
      ? /** @type {Record<string, unknown>} */ (session.metadata)
      : null;
  const raw = meta?.internalCheckoutId;
  if (raw == null || String(raw).trim() === '') {
    return {
      ok: false,
      failureClass: WEBHOOK_PAYMENT_TRUTH_FAILURE.MISSING_INTERNAL_CHECKOUT_ID,
      audit: { ...baseAudit, validated: false },
    };
  }
  const internalId = String(raw);
  if (!isLikelyPaymentCheckoutId(internalId)) {
    return {
      ok: false,
      failureClass: WEBHOOK_PAYMENT_TRUTH_FAILURE.MISSING_INTERNAL_CHECKOUT_ID,
      audit: { ...baseAudit, validated: false },
    };
  }

  if (!order || typeof order !== 'object') {
    return {
      ok: false,
      failureClass: WEBHOOK_PAYMENT_TRUTH_FAILURE.ORDER_NOT_FOUND,
      audit: { ...baseAudit, validated: false, internalCheckoutIdSuffix: internalId.slice(-12) },
    };
  }

  if (order.id != null && internalId !== String(order.id)) {
    return {
      ok: false,
      failureClass: WEBHOOK_PAYMENT_TRUTH_FAILURE.MISSING_INTERNAL_CHECKOUT_ID,
      audit: {
        ...baseAudit,
        validated: false,
        detail: 'metadata_internal_checkout_id_mismatch_order_row',
      },
    };
  }

  if (order.userId == null) {
    return {
      ok: false,
      failureClass: WEBHOOK_PAYMENT_TRUTH_FAILURE.ORDER_NOT_FOUND,
      audit: { ...baseAudit, validated: false },
    };
  }

  const os = String(order.orderStatus ?? '');
  if (os === ORDER_STATUS.PAID || os === ORDER_STATUS.PROCESSING) {
    return {
      ok: false,
      failureClass: WEBHOOK_PAYMENT_TRUTH_FAILURE.DUPLICATE_EVENT,
      audit: { ...baseAudit, validated: false, orderStatus: os },
    };
  }

  if (isTerminalOrderStatus(os)) {
    return {
      ok: false,
      failureClass: WEBHOOK_PAYMENT_TRUTH_FAILURE.TERMINAL_CONFLICT,
      manualReview: true,
      audit: { ...baseAudit, validated: false, orderStatus: os },
    };
  }

  if (os !== ORDER_STATUS.PENDING) {
    return {
      ok: false,
      failureClass: WEBHOOK_PAYMENT_TRUTH_FAILURE.TERMINAL_CONFLICT,
      manualReview: true,
      audit: { ...baseAudit, validated: false, orderStatus: os },
    };
  }

  const integrity = evaluateStripeCheckoutSessionRowIntegrity(order, session);
  if (!integrity.ok) {
    const fc =
      integrity.reason === 'stripe_checkout_session_id_mismatch'
        ? WEBHOOK_PAYMENT_TRUTH_FAILURE.STRIPE_SESSION_MISMATCH
        : WEBHOOK_PAYMENT_TRUTH_FAILURE.STRIPE_SESSION_MISMATCH;
    return {
      ok: false,
      failureClass: fc,
      manualReview: true,
      audit: {
        ...baseAudit,
        validated: false,
        integrityReason:
          typeof integrity.reason === 'string' ? integrity.reason : null,
      },
    };
  }

  const ac = assertWebhookAmountCurrencyMatch({ session, order });
  if (!ac.ok) {
    return {
      ok: false,
      failureClass: ac.failureClass,
      manualReview: true,
      audit: { ...baseAudit, validated: false, detail: ac.detail ?? null },
    };
  }

  const mode = String(session.mode ?? '');
  if (mode !== 'payment') {
    return {
      ok: false,
      failureClass: WEBHOOK_PAYMENT_TRUTH_FAILURE.UNSUPPORTED_EVENT_TYPE,
      audit: { ...baseAudit, validated: false, mode },
    };
  }

  const payStatus = String(session.payment_status ?? '');
  if (payStatus !== 'paid') {
    return {
      ok: false,
      failureClass: WEBHOOK_PAYMENT_TRUTH_FAILURE.UNPAID_SESSION,
      manualReview: true,
      audit: { ...baseAudit, validated: false, payment_status: payStatus },
    };
  }

  return {
    ok: true,
    stripeSessionId: integrity.stripeSessionId,
    audit: {
      ...baseAudit,
      validated: true,
      webhook_truth_validated: true,
      amountUsdCents: order.amountUsdCents,
      currency: String(order.currency ?? 'usd').toLowerCase(),
    },
  };
}

/**
 * @param {{
 *   session?: Record<string, unknown> | null,
 *   order?: Record<string, unknown> | null,
 *   traceId?: string | null,
 *   stripeEventType?: string | null,
 *   failureClass?: string | null,
 * }} p
 */
export function buildWebhookTruthAuditPayload(p) {
  const sid =
    p.session && typeof p.session.id === 'string' ? p.session.id.slice(-12) : null;
  const oid =
    p.order && typeof p.order.id === 'string' ? p.order.id.slice(-12) : null;
  return {
    stripeSessionIdSuffix: sid,
    orderIdSuffix: oid,
    traceId: p.traceId ?? null,
    stripeEventType: p.stripeEventType ?? null,
    failureClass: p.failureClass ?? null,
  };
}
