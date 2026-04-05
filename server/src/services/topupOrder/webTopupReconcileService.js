import { PAYMENT_STATUS } from '../../domain/topupOrder/statuses.js';
import { getStripeClient } from '../stripe.js';
import { prisma } from '../../db.js';
import { sessionKeySuffix, webTopupLog } from '../../lib/webTopupObservability.js';
import { isValidTopupOrderId } from './topupOrderService.js';

/**
 * Pure comparison for tests — no I/O.
 * @param {object} orderSlice — minimal fields from DB
 * @param {object | null} piSlice — minimal fields from Stripe PI or null
 */
export function compareWebTopupOrderToStripeIntent(orderSlice, piSlice) {
  /** @type {string[]} */
  const issues = [];

  if (!piSlice) {
    if (orderSlice.paymentIntentId) {
      issues.push('stripe_pi_missing');
    }
    return { consistent: issues.length === 0, issues };
  }

  if (orderSlice.paymentIntentId && orderSlice.paymentIntentId !== piSlice.id) {
    issues.push('payment_intent_mismatch');
  }

  const cur = String(piSlice.currency ?? '').toLowerCase();
  const ordCur = String(orderSlice.currency ?? 'usd').toLowerCase();
  if (cur !== ordCur) {
    issues.push('currency_mismatch');
  }

  const amt = typeof piSlice.amount === 'number' ? piSlice.amount : Number(piSlice.amount);
  if (Number.isFinite(amt) && amt !== orderSlice.amountCents) {
    issues.push('amount_mismatch');
  }

  const meta = piSlice.metadata?.topup_order_id;
  if (meta != null && String(meta).length > 0 && String(meta) !== orderSlice.id) {
    issues.push('metadata_order_mismatch');
  }

  if (orderSlice.paymentStatus === PAYMENT_STATUS.PAID && piSlice.status !== 'succeeded') {
    issues.push('invalid_payment_intent_state');
  }

  if (orderSlice.paymentStatus === PAYMENT_STATUS.PENDING && piSlice.status === 'succeeded') {
    issues.push('order_pending_but_pi_succeeded');
  }

  return { consistent: issues.length === 0, issues };
}

/**
 * Admin diagnostics: DB row vs live Stripe PaymentIntent (read-only).
 * @param {string} orderId
 * @param {import('pino').Logger | undefined} log
 */
export async function reconcileWebTopupOrder(orderId, log) {
  if (!isValidTopupOrderId(orderId)) {
    return { ok: false, error: 'invalid_order_id' };
  }

  const row = await prisma.webTopupOrder.findUnique({ where: { id: orderId } });
  if (!row) {
    webTopupLog(log, 'info', 'reconciliation_checked', {
      orderIdSuffix: orderId.slice(-8),
      found: false,
    });
    return { ok: false, error: 'not_found' };
  }

  /** @type {object | null} */
  let piSlice = null;
  const piId = row.paymentIntentId;
  if (piId) {
    const stripe = getStripeClient();
    if (stripe) {
      try {
        const pi = await stripe.paymentIntents.retrieve(piId);
        piSlice = {
          id: pi.id,
          status: pi.status,
          amount: pi.amount,
          currency: pi.currency,
          metadata: pi.metadata ?? {},
        };
      } catch (e) {
        piSlice = null;
        webTopupLog(log, 'warn', 'reconciliation_checked', {
          orderIdSuffix: row.id.slice(-8),
          paymentIntentIdSuffix: piId.slice(-10),
          stripeRetrieveFailed: true,
        });
      }
    }
  }

  const orderSlice = {
    id: row.id,
    paymentStatus: row.paymentStatus,
    fulfillmentStatus: row.fulfillmentStatus,
    amountCents: row.amountCents,
    currency: row.currency,
    paymentIntentId: row.paymentIntentId,
    completedByStripeEventId: row.completedByStripeEventId,
  };

  const { consistent, issues } = compareWebTopupOrderToStripeIntent(orderSlice, piSlice);

  webTopupLog(log, 'info', 'reconciliation_checked', {
    orderIdSuffix: row.id.slice(-8),
    sessionKeySuffix: sessionKeySuffix(row.sessionKey),
    paymentIntentIdSuffix: piId ? piId.slice(-10) : undefined,
    consistent,
    issueCount: issues.length,
  });

  if (!consistent) {
    webTopupLog(log, 'warn', 'reconciliation_mismatch_detected', {
      orderIdSuffix: row.id.slice(-8),
      issues,
    });
  }

  return {
    ok: true,
    order: {
      id: row.id,
      paymentStatus: row.paymentStatus,
      fulfillmentStatus: row.fulfillmentStatus,
      amountCents: row.amountCents,
      currency: row.currency,
      paymentIntentIdSuffix: piId ? piId.slice(-10) : null,
      completedByStripeEventIdSuffix: row.completedByStripeEventId
        ? String(row.completedByStripeEventId).slice(-12)
        : null,
      updatedAt: row.updatedAt.toISOString(),
    },
    stripe: piSlice
      ? {
          paymentIntentIdSuffix: String(piSlice.id).slice(-10),
          status: piSlice.status,
          amount: piSlice.amount,
          currency: piSlice.currency,
          metadataHasTopupOrderId: Boolean(piSlice.metadata?.topup_order_id),
        }
      : piId
        ? { error: 'unavailable_or_missing' }
        : null,
    consistent,
    issues,
  };
}
