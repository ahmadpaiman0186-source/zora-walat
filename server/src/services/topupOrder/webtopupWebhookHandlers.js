import {
  FULFILLMENT_STATUS,
  PAYMENT_STATUS,
} from '../../domain/topupOrder/statuses.js';
import {
  safeSuffix,
  webTopupLog,
} from '../../lib/webTopupObservability.js';

const TW_ORD = /^tw_ord_[0-9a-f-]{36}$/i;

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {import('stripe').Stripe.Event} event
 * @param {import('stripe').Stripe.PaymentIntent} pi
 * @param {import('pino').Logger | undefined} log
 */
export async function handleWebTopupPaymentIntentSucceeded(tx, event, pi, log) {
  const orderId = pi.metadata?.topup_order_id;
  if (!orderId || typeof orderId !== 'string' || !TW_ORD.test(orderId)) {
    webTopupLog(log, 'info', 'payment_succeeded', {
      applied: false,
      mismatchReason: 'missing_metadata',
      stripeEventType: event.type,
      stripeEventIdSuffix: safeSuffix(event.id, 12),
      paymentIntentIdSuffix: safeSuffix(pi.id, 10),
    });
    return;
  }

  const piStatus = String(pi.status ?? '');
  if (piStatus !== 'succeeded') {
    webTopupLog(log, 'warn', 'payment_succeeded', {
      applied: false,
      mismatchReason: 'invalid_payment_intent_state',
      stripeStatus: piStatus,
      orderIdSuffix: orderId.slice(-8),
      stripeEventIdSuffix: safeSuffix(event.id, 12),
      paymentIntentIdSuffix: safeSuffix(pi.id, 10),
    });
    return;
  }

  const row = await tx.webTopupOrder.findUnique({ where: { id: orderId } });
  if (!row) {
    webTopupLog(log, 'warn', 'payment_succeeded', {
      applied: false,
      mismatchReason: 'order_not_found',
      orderIdSuffix: orderId.slice(-8),
      paymentIntentIdSuffix: safeSuffix(pi.id, 10),
      stripeEventIdSuffix: safeSuffix(event.id, 12),
    });
    return;
  }

  if (row.paymentStatus === PAYMENT_STATUS.PAID) {
    if (row.paymentIntentId !== pi.id) {
      webTopupLog(log, 'warn', 'payment_succeeded', {
        applied: false,
        mismatchReason: 'order_already_paid_other_intent',
        orderIdSuffix: orderId.slice(-8),
        paymentIntentIdSuffix: safeSuffix(pi.id, 10),
        stripeEventIdSuffix: safeSuffix(event.id, 12),
      });
      webTopupLog(log, 'warn', 'suspicious_request_detected', {
        kind: 'webhook_pi_mismatch_paid_order',
        orderIdSuffix: orderId.slice(-8),
      });
      return;
    }
    const attachPaid = await tx.webTopupOrder.updateMany({
      where: {
        id: orderId,
        paymentStatus: PAYMENT_STATUS.PAID,
        paymentIntentId: pi.id,
        completedByStripeEventId: null,
      },
      data: { completedByStripeEventId: event.id },
    });
    webTopupLog(log, 'info', 'payment_succeeded', {
      applied: attachPaid.count >= 1,
      idempotent: attachPaid.count === 0,
      orderIdSuffix: orderId.slice(-8),
      paymentIntentIdSuffix: safeSuffix(pi.id, 10),
      stripeEventIdSuffix: safeSuffix(event.id, 12),
    });
    return;
  }

  if (row.paymentIntentId && row.paymentIntentId !== pi.id) {
    webTopupLog(log, 'warn', 'payment_succeeded', {
      applied: false,
      mismatchReason: 'payment_intent_mismatch',
      orderIdSuffix: orderId.slice(-8),
      paymentIntentIdSuffix: safeSuffix(pi.id, 10),
      stripeEventIdSuffix: safeSuffix(event.id, 12),
    });
    return;
  }

  const amt = typeof pi.amount === 'number' ? pi.amount : Number(pi.amount);
  const cur = String(pi.currency ?? '').toLowerCase();
  if (cur !== 'usd') {
    webTopupLog(log, 'error', 'payment_succeeded', {
      applied: false,
      mismatchReason: 'currency_mismatch',
      orderIdSuffix: orderId.slice(-8),
      expectedCurrency: 'usd',
      stripeCurrency: cur,
      paymentIntentIdSuffix: safeSuffix(pi.id, 10),
    });
    await tx.webTopupOrder.updateMany({
      where: {
        id: orderId,
        paymentStatus: PAYMENT_STATUS.PENDING,
      },
      data: {
        paymentStatus: PAYMENT_STATUS.FAILED,
        fulfillmentStatus: FULFILLMENT_STATUS.FAILED,
        paymentIntentId: pi.id,
      },
    });
    webTopupLog(log, 'info', 'payment_failed', {
      source: 'webhook',
      orderIdSuffix: orderId.slice(-8),
      reason: 'currency_mismatch',
    });
    return;
  }

  if (amt !== row.amountCents) {
    webTopupLog(log, 'error', 'payment_succeeded', {
      applied: false,
      mismatchReason: 'amount_mismatch',
      orderIdSuffix: orderId.slice(-8),
      expectedCents: row.amountCents,
      stripeAmount: amt,
      paymentIntentIdSuffix: safeSuffix(pi.id, 10),
    });
    await tx.webTopupOrder.updateMany({
      where: {
        id: orderId,
        paymentStatus: PAYMENT_STATUS.PENDING,
      },
      data: {
        paymentStatus: PAYMENT_STATUS.FAILED,
        fulfillmentStatus: FULFILLMENT_STATUS.FAILED,
        paymentIntentId: pi.id,
      },
    });
    webTopupLog(log, 'info', 'payment_failed', {
      source: 'webhook',
      orderIdSuffix: orderId.slice(-8),
      reason: 'amount_mismatch',
    });
    return;
  }

  const appliedPending = await tx.webTopupOrder.updateMany({
    where: {
      id: orderId,
      paymentStatus: PAYMENT_STATUS.PENDING,
      completedByStripeEventId: null,
    },
    data: {
      paymentIntentId: pi.id,
      paymentStatus: PAYMENT_STATUS.PAID,
      fulfillmentStatus: FULFILLMENT_STATUS.PENDING,
      completedByStripeEventId: event.id,
    },
  });

  if (appliedPending.count >= 1) {
    webTopupLog(log, 'info', 'payment_succeeded', {
      applied: true,
      orderIdSuffix: orderId.slice(-8),
      paymentIntentIdSuffix: safeSuffix(pi.id, 10),
      stripeEventIdSuffix: safeSuffix(event.id, 12),
    });
    return;
  }

  const attachEventOnly = await tx.webTopupOrder.updateMany({
    where: {
      id: orderId,
      paymentStatus: PAYMENT_STATUS.PAID,
      paymentIntentId: pi.id,
      completedByStripeEventId: null,
    },
    data: { completedByStripeEventId: event.id },
  });

  if (attachEventOnly.count >= 1) {
    webTopupLog(log, 'info', 'payment_succeeded', {
      applied: true,
      idempotent: true,
      orderIdSuffix: orderId.slice(-8),
      paymentIntentIdSuffix: safeSuffix(pi.id, 10),
      stripeEventIdSuffix: safeSuffix(event.id, 12),
    });
  }
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {import('stripe').Stripe.PaymentIntent} pi
 * @param {import('pino').Logger | undefined} log
 */
export async function handleWebTopupPaymentIntentFailed(tx, pi, log) {
  const orderId = pi.metadata?.topup_order_id;
  if (!orderId || typeof orderId !== 'string' || !TW_ORD.test(orderId)) {
    webTopupLog(log, 'info', 'payment_failed', {
      applied: false,
      mismatchReason: 'missing_metadata',
      paymentIntentIdSuffix: safeSuffix(pi.id, 10),
    });
    return;
  }

  const row = await tx.webTopupOrder.findUnique({
    where: { id: orderId },
    select: { paymentStatus: true },
  });

  if (row?.paymentStatus === PAYMENT_STATUS.PAID) {
    webTopupLog(log, 'info', 'payment_failed', {
      applied: false,
      reason: 'already_paid_ignored',
      orderIdSuffix: orderId.slice(-8),
      paymentIntentIdSuffix: safeSuffix(pi.id, 10),
    });
    return;
  }

  const n = await tx.webTopupOrder.updateMany({
    where: {
      id: orderId,
      paymentStatus: PAYMENT_STATUS.PENDING,
    },
    data: {
      paymentStatus: PAYMENT_STATUS.FAILED,
      fulfillmentStatus: FULFILLMENT_STATUS.FAILED,
      paymentIntentId: pi.id,
    },
  });

  webTopupLog(log, 'info', 'payment_failed', {
    applied: n.count >= 1,
    source: 'webhook',
    orderIdSuffix: orderId.slice(-8),
    paymentIntentIdSuffix: safeSuffix(pi.id, 10),
  });
}
