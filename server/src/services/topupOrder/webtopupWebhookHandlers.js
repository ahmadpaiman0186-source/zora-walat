import {
  FULFILLMENT_STATUS,
  PAYMENT_STATUS,
} from '../../domain/topupOrder/statuses.js';
import { assertWebTopupPaymentTransition } from '../../domain/topupOrder/webtopupStateMachine.js';
import {
  safeSuffix,
  webTopupCorrelationFields,
  webTopupLog,
} from '../../lib/webTopupObservability.js';
import { recordMoneyPathOpsSignal } from '../../lib/opsMetrics.js';
import {
  mirrorCanonicalWebTopupOrder,
  mirrorCanonicalWebTopupOrderById,
} from '../canonicalTransactionSync.js';

const TW_ORD = /^tw_ord_[0-9a-f-]{36}$/i;

/**
 * @param {{ traceId?: string | null }} [ctx]
 * @param {import('stripe').Stripe.Event} event
 * @param {string} orderId
 */
function webtopWebhookFlowTrace(ctx, event, orderId) {
  const t = ctx?.traceId;
  if (typeof t === 'string' && t.trim()) return t.trim().slice(0, 128);
  return `wt_evt_${safeSuffix(event.id, 12)}_${orderId.slice(-8)}`;
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {import('stripe').Stripe.Event} event
 * @param {import('stripe').Stripe.PaymentIntent} pi
 * @param {import('pino').Logger | undefined} log
 * @param {{ traceId?: string | null }} [ctx]
 * @returns {Promise<{ scheduleWebTopupFulfillment: string | null }>}
 */
export async function handleWebTopupPaymentIntentSucceeded(tx, event, pi, log, ctx = {}) {
  const orderId = pi.metadata?.topup_order_id;
  if (!orderId || typeof orderId !== 'string' || !TW_ORD.test(orderId)) {
    webTopupLog(log, 'info', 'payment_succeeded', {
      applied: false,
      mismatchReason: 'missing_metadata',
      stripeEventType: event.type,
      stripeEventIdSuffix: safeSuffix(event.id, 12),
      paymentIntentIdSuffix: safeSuffix(pi.id, 10),
    });
    return { scheduleWebTopupFulfillment: null };
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
    return { scheduleWebTopupFulfillment: null };
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
    return { scheduleWebTopupFulfillment: null };
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
      return { scheduleWebTopupFulfillment: null };
    }
    const attachPaid = await tx.webTopupOrder.updateMany({
      where: {
        id: orderId,
        paymentStatus: PAYMENT_STATUS.PAID,
        paymentIntentId: pi.id,
        completedByStripeEventId: null,
      },
      data: {
        completedByStripeEventId: event.id,
        paidAt: row.paidAt ?? new Date(),
      },
    });
    if (attachPaid.count === 0) {
      recordMoneyPathOpsSignal('webtop_pi_paid_webhook_row_replay');
    }
    webTopupLog(log, 'info', 'payment_succeeded', {
      applied: attachPaid.count >= 1,
      idempotent: attachPaid.count === 0,
      orderIdSuffix: orderId.slice(-8),
      paymentIntentIdSuffix: safeSuffix(pi.id, 10),
      stripeEventIdSuffix: safeSuffix(event.id, 12),
      traceId: webtopWebhookFlowTrace(ctx, event, orderId),
    });
    webTopupLog(log, 'info', 'payment_received', {
      ...webTopupCorrelationFields(orderId, pi.id, webtopWebhookFlowTrace(ctx, event, orderId)),
      stripeEventIdSuffix: safeSuffix(event.id, 12),
      source: 'stripe_webhook',
      applied: attachPaid.count >= 1,
      idempotentStripeEventAttach: attachPaid.count === 0,
    });
    const refreshedPaid = await tx.webTopupOrder.findUnique({
      where: { id: orderId },
    });
    if (refreshedPaid) {
      await mirrorCanonicalWebTopupOrder(tx, refreshedPaid, log);
    }
    return { scheduleWebTopupFulfillment: null };
  }

  if (row.paymentIntentId && row.paymentIntentId !== pi.id) {
    webTopupLog(log, 'warn', 'payment_succeeded', {
      applied: false,
      mismatchReason: 'payment_intent_mismatch',
      orderIdSuffix: orderId.slice(-8),
      paymentIntentIdSuffix: safeSuffix(pi.id, 10),
      stripeEventIdSuffix: safeSuffix(event.id, 12),
    });
    return { scheduleWebTopupFulfillment: null };
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
    const curFail = assertWebTopupPaymentTransition(
      row.paymentStatus,
      PAYMENT_STATUS.FAILED,
      'webhook',
    );
    if (curFail.ok) {
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
    }
    webTopupLog(log, 'info', 'payment_failed', {
      source: 'webhook',
      orderIdSuffix: orderId.slice(-8),
      reason: 'currency_mismatch',
    });
    return { scheduleWebTopupFulfillment: null };
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
    const failTrans = assertWebTopupPaymentTransition(
      row.paymentStatus,
      PAYMENT_STATUS.FAILED,
      'webhook',
    );
    if (failTrans.ok) {
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
    }
    webTopupLog(log, 'info', 'payment_failed', {
      source: 'webhook',
      orderIdSuffix: orderId.slice(-8),
      reason: 'amount_mismatch',
    });
    await mirrorCanonicalWebTopupOrderById(tx, orderId, log);
    return { scheduleWebTopupFulfillment: null };
  }

  const pendingToPaid = assertWebTopupPaymentTransition(
    row.paymentStatus,
    PAYMENT_STATUS.PAID,
    'webhook',
  );
  if (!pendingToPaid.ok) {
    webTopupLog(log, 'warn', 'payment_succeeded', {
      applied: false,
      mismatchReason: 'forbidden_payment_transition',
      orderIdSuffix: orderId.slice(-8),
      fromStatus: row.paymentStatus,
      paymentIntentIdSuffix: safeSuffix(pi.id, 10),
    });
    return { scheduleWebTopupFulfillment: null };
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
      paidAt: new Date(),
    },
  });

  if (appliedPending.count >= 1) {
    const trace = webtopWebhookFlowTrace(ctx, event, orderId);
    webTopupLog(log, 'info', 'payment_succeeded', {
      applied: true,
      orderIdSuffix: orderId.slice(-8),
      paymentIntentIdSuffix: safeSuffix(pi.id, 10),
      stripeEventIdSuffix: safeSuffix(event.id, 12),
      traceId: trace,
    });
    webTopupLog(log, 'info', 'payment_received', {
      ...webTopupCorrelationFields(orderId, pi.id, trace),
      stripeEventIdSuffix: safeSuffix(event.id, 12),
      source: 'stripe_webhook',
      applied: true,
      idempotent: false,
    });
    const rFresh = await tx.webTopupOrder.findUnique({ where: { id: orderId } });
    if (rFresh) {
      await mirrorCanonicalWebTopupOrder(tx, rFresh, log);
    }
    return { scheduleWebTopupFulfillment: orderId };
  }

  const attachEventOnly = await tx.webTopupOrder.updateMany({
    where: {
      id: orderId,
      paymentStatus: PAYMENT_STATUS.PAID,
      paymentIntentId: pi.id,
      completedByStripeEventId: null,
    },
    data: {
      completedByStripeEventId: event.id,
      paidAt: row.paidAt ?? row.updatedAt ?? new Date(),
    },
  });

  if (attachEventOnly.count >= 1) {
    recordMoneyPathOpsSignal('webtop_pi_paid_webhook_event_attach_replay');
    const trace = webtopWebhookFlowTrace(ctx, event, orderId);
    webTopupLog(log, 'info', 'payment_succeeded', {
      applied: true,
      idempotent: true,
      orderIdSuffix: orderId.slice(-8),
      paymentIntentIdSuffix: safeSuffix(pi.id, 10),
      stripeEventIdSuffix: safeSuffix(event.id, 12),
      traceId: trace,
    });
    webTopupLog(log, 'info', 'payment_received', {
      ...webTopupCorrelationFields(orderId, pi.id, trace),
      stripeEventIdSuffix: safeSuffix(event.id, 12),
      source: 'stripe_webhook',
      applied: true,
      idempotent: true,
    });
  }
  const rTail = await tx.webTopupOrder.findUnique({ where: { id: orderId } });
  if (rTail) {
    await mirrorCanonicalWebTopupOrder(tx, rTail, log);
  }
  return { scheduleWebTopupFulfillment: null };
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

  if (row) {
    const toFailed = assertWebTopupPaymentTransition(
      row.paymentStatus,
      PAYMENT_STATUS.FAILED,
      'webhook',
    );
    if (!toFailed.ok) {
      webTopupLog(log, 'warn', 'payment_failed', {
        applied: false,
        reason: 'forbidden_payment_transition',
        orderIdSuffix: orderId.slice(-8),
        fromStatus: row.paymentStatus,
        paymentIntentIdSuffix: safeSuffix(pi.id, 10),
      });
      return;
    }
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
  if (n.count >= 1) {
    await mirrorCanonicalWebTopupOrderById(tx, orderId, log);
  }
}
