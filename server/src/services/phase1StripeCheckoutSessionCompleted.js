import { PAYMENT_CHECKOUT_STATUS } from '../constants/paymentCheckoutStatus.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../constants/fulfillmentAttemptStatus.js';
import { isLikelyPaymentCheckoutId } from '../lib/paymentCheckoutId.js';
import { assertTransition } from '../domain/orders/orderLifecycle.js';
import { writeOrderAudit } from './orderAuditService.js';
import { ensureQueuedFulfillmentAttempt } from './fulfillmentProcessingService.js';
import {
  emitPhase1FulfillmentQueued,
  emitPhase1PaymentSucceeded,
} from '../infrastructure/logging/phase1Observability.js';
import { emitFortressIdempotencyNoop } from '../lib/transactionFortressIdempotency.js';
import { validatePaymentCheckoutStatusTransition } from '../domain/orders/phase1LifecyclePolicy.js';
import { evaluateStripeCheckoutSessionRowIntegrity } from '../lib/paymentCompletionLinkage.js';
import { mirrorCanonicalPaymentCheckoutById } from './canonicalTransactionSync.js';

const PAYMENT_PRE_SUCCESS = [
  PAYMENT_CHECKOUT_STATUS.INITIATED,
  PAYMENT_CHECKOUT_STATUS.PAYMENT_PENDING,
  PAYMENT_CHECKOUT_STATUS.CHECKOUT_CREATED,
];

export function stripeSessionPaymentIntentId(session) {
  const pi = session.payment_intent;
  if (typeof pi === 'string') return pi;
  if (pi && typeof pi === 'object' && pi.id != null) return String(pi.id);
  return null;
}

export function stripeSessionCustomerId(session) {
  const c = session.customer;
  if (typeof c === 'string') return c;
  if (c && typeof c === 'object' && c.id != null) return String(c.id);
  return null;
}

/**
 * Apply Phase 1 `checkout.session.completed` inside an existing transaction (after StripeWebhookEvent row created).
 * Idempotent on order row when not PENDING / already paid.
 *
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {object} opts
 * @param {string} opts.eventId Stripe `evt_…`
 * @param {object} opts.session Stripe Checkout Session payload
 * @param {{ warn?: Function, error?: Function, info?: Function }} [opts.log]
 * @param {string | null} [opts.traceId]
 * @param {string | null} [opts.requestId] Correlation id (often same as trace / `x-request-id`)
 * @param {string} [opts.stripeEventType]
 * @returns {Promise<{ orderIdToScheduleFulfillment: string | null, checkoutAmountMismatchOrderId: string | null, paymentIntentIdsForFeeCapture: string[] }>}
 */
export async function applyPhase1CheckoutSessionCompleted(tx, opts) {
  const { eventId, session, log } = opts;
  const traceId = opts.traceId ?? null;
  const requestId = opts.requestId ?? traceId;
  const stripeEventType = opts.stripeEventType ?? 'checkout.session.completed';
  let orderIdToScheduleFulfillment = null;
  let checkoutAmountMismatchOrderId = null;
  const paymentIntentIdsForFeeCapture = [];

  const raw = session.metadata?.internalCheckoutId;
  if (!raw) {
    log?.info?.(
      {
        phase1CheckoutSessionCompletedNoInternalMetadata: true,
        stripeSessionIdSuffix:
          typeof session?.id === 'string' ? session.id.slice(-12) : null,
      },
      'stripe webhook: checkout.session.completed without internalCheckoutId metadata',
    );
    return {
      orderIdToScheduleFulfillment,
      checkoutAmountMismatchOrderId,
      paymentIntentIdsForFeeCapture,
    };
  }
  if (!isLikelyPaymentCheckoutId(raw)) {
    log?.warn?.(
      { securityEvent: 'webhook_invalid_metadata_shape' },
      'security',
    );
    return {
      orderIdToScheduleFulfillment,
      checkoutAmountMismatchOrderId,
      paymentIntentIdsForFeeCapture,
    };
  }

  const row = await tx.paymentCheckout.findUnique({
    where: { id: raw },
  });
  if (!row) {
    log?.warn?.('stripe webhook: unknown checkout row');
    return {
      orderIdToScheduleFulfillment,
      checkoutAmountMismatchOrderId,
      paymentIntentIdsForFeeCapture,
    };
  }
  if (row.userId == null) {
    log?.warn?.(
      { securityEvent: 'webhook_checkout_missing_user' },
      'security',
    );
    return {
      orderIdToScheduleFulfillment,
      checkoutAmountMismatchOrderId,
      paymentIntentIdsForFeeCapture,
    };
  }

  const integrity = evaluateStripeCheckoutSessionRowIntegrity(row, session);
  if (!integrity.ok) {
    if (integrity.securityEvent) {
      log?.warn?.(
        {
          securityEvent: integrity.securityEvent,
          reason: integrity.reason,
          orderIdSuffix: String(raw).slice(-12),
          stripeSessionIdSuffix:
            typeof session?.id === 'string' ? session.id.slice(-12) : null,
        },
        'security',
      );
    } else {
      log?.warn?.(
        { reason: integrity.reason, orderIdSuffix: String(raw).slice(-12) },
        'stripe webhook: checkout session integrity',
      );
    }
    if (integrity.reason === 'stripe_checkout_session_id_mismatch' && row.orderStatus === ORDER_STATUS.PENDING) {
      const payTrans = validatePaymentCheckoutStatusTransition(
        row.status,
        PAYMENT_CHECKOUT_STATUS.PAYMENT_FAILED,
      );
      if (payTrans.ok) {
        assertTransition(row.orderStatus, ORDER_STATUS.FAILED);
        await tx.paymentCheckout.updateMany({
          where: {
            id: raw,
            orderStatus: ORDER_STATUS.PENDING,
          },
          data: {
            orderStatus: ORDER_STATUS.FAILED,
            status: PAYMENT_CHECKOUT_STATUS.PAYMENT_FAILED,
            failedAt: new Date(),
            failureReason: 'stripe_checkout_session_mismatch',
          },
        });
        await writeOrderAudit(tx, {
          event: 'order_status_changed',
          payload: {
            orderId: raw,
            to: ORDER_STATUS.FAILED,
            reason: 'stripe_checkout_session_mismatch',
          },
          ip: null,
        });
      }
    }
    await mirrorCanonicalPaymentCheckoutById(tx, raw, log);
    return {
      orderIdToScheduleFulfillment,
      checkoutAmountMismatchOrderId,
      paymentIntentIdsForFeeCapture,
    };
  }
  const stripeSessionId = integrity.stripeSessionId;

  const total = session.amount_total;
  const sessionCurrency = String(session.currency ?? 'usd').toLowerCase();
  const rowCurrency = String(row.currency ?? 'usd').toLowerCase();
  if (total == null) {
    log?.warn?.('stripe webhook: missing amount_total');
    return {
      orderIdToScheduleFulfillment,
      checkoutAmountMismatchOrderId,
      paymentIntentIdsForFeeCapture,
    };
  }

  if (total !== row.amountUsdCents || sessionCurrency !== rowCurrency) {
    checkoutAmountMismatchOrderId = raw;
    log?.error?.(
      {
        expectedCents: row.amountUsdCents,
        stripeTotal: total,
        expectedCurrency: rowCurrency,
        stripeCurrency: sessionCurrency,
      },
      'stripe webhook: amount or currency mismatch',
    );
    if (row.orderStatus === ORDER_STATUS.PENDING) {
      const payTrans = validatePaymentCheckoutStatusTransition(
        row.status,
        PAYMENT_CHECKOUT_STATUS.PAYMENT_FAILED,
      );
      if (!payTrans.ok) {
        log?.error?.(
          {
            fortressDenial: payTrans.denial,
            detail: payTrans.detail,
            orderIdSuffix: String(raw).slice(-12),
          },
          'phase1 webhook: payment row transition denied (mismatch fail path)',
        );
        return {
          orderIdToScheduleFulfillment,
          checkoutAmountMismatchOrderId,
          paymentIntentIdsForFeeCapture,
        };
      }
      assertTransition(row.orderStatus, ORDER_STATUS.FAILED);
      await tx.paymentCheckout.updateMany({
        where: {
          id: raw,
          orderStatus: ORDER_STATUS.PENDING,
        },
        data: {
          orderStatus: ORDER_STATUS.FAILED,
          status: PAYMENT_CHECKOUT_STATUS.PAYMENT_FAILED,
          failedAt: new Date(),
          failureReason: 'stripe_amount_currency_mismatch',
        },
      });
      await writeOrderAudit(tx, {
        event: 'order_status_changed',
        payload: {
          orderId: raw,
          to: ORDER_STATUS.FAILED,
          reason: 'amount_currency_mismatch',
        },
        ip: null,
      });
    }
    await mirrorCanonicalPaymentCheckoutById(tx, raw, log);
    return {
      orderIdToScheduleFulfillment,
      checkoutAmountMismatchOrderId,
      paymentIntentIdsForFeeCapture,
    };
  }

  if (row.orderStatus !== ORDER_STATUS.PENDING) {
    if (
      row.orderStatus === ORDER_STATUS.PAID ||
      row.orderStatus === ORDER_STATUS.PROCESSING
    ) {
      emitFortressIdempotencyNoop('CHECKOUT_SESSION_REPLAY_AFTER_PAID', {
        orderIdSuffix: String(raw).slice(-12),
        orderStatus: row.orderStatus,
      });
    }
    await mirrorCanonicalPaymentCheckoutById(tx, raw, log);
    return {
      orderIdToScheduleFulfillment,
      checkoutAmountMismatchOrderId,
      paymentIntentIdsForFeeCapture,
    };
  }

  assertTransition(row.orderStatus, ORDER_STATUS.PAID);

  const paymentStatusBeforePaid = row.status;
  const payToSucceeded = validatePaymentCheckoutStatusTransition(
    row.status,
    PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
  );
  if (!payToSucceeded.ok) {
    log?.error?.(
      {
        fortressDenial: payToSucceeded.denial,
        detail: payToSucceeded.detail,
        orderIdSuffix: String(raw).slice(-12),
      },
      'phase1 webhook: payment row transition denied (paid path)',
    );
    await mirrorCanonicalPaymentCheckoutById(tx, raw, log);
    return {
      orderIdToScheduleFulfillment,
      checkoutAmountMismatchOrderId,
      paymentIntentIdsForFeeCapture,
    };
  }

  const piId = stripeSessionPaymentIntentId(session);
  const custId = stripeSessionCustomerId(session);

  const updated = await tx.paymentCheckout.updateMany({
    where: {
      id: raw,
      orderStatus: ORDER_STATUS.PENDING,
      status: { in: PAYMENT_PRE_SUCCESS },
    },
    data: {
      orderStatus: ORDER_STATUS.PAID,
      status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
      stripeCheckoutSessionId: stripeSessionId,
      stripePaymentIntentId: piId,
      stripeCustomerId: custId,
      completedByWebhookEventId: eventId,
      paidAt: new Date(),
    },
  });

  if (updated.count === 0) {
    emitFortressIdempotencyNoop('CHECKOUT_SESSION_PAID_TRANSITION_RACE', {
      orderIdSuffix: String(raw).slice(-12),
    });
    await mirrorCanonicalPaymentCheckoutById(tx, raw, log);
    return {
      orderIdToScheduleFulfillment,
      checkoutAmountMismatchOrderId,
      paymentIntentIdsForFeeCapture,
    };
  }

  if (piId) {
    paymentIntentIdsForFeeCapture.push(piId);
  }

  log?.info?.(
    {
      phase1PaymentCompletionPersisted: true,
      orderIdSuffix: String(raw).slice(-12),
      stripeEventIdSuffix: String(eventId).slice(-12),
      stripeSessionIdSuffix: stripeSessionId.slice(-12),
      paymentIntentIdSuffix: piId ? piId.slice(-12) : null,
    },
    'phase1 payment completion persisted',
  );

  await writeOrderAudit(tx, {
    event: 'order_status_changed',
    payload: { orderId: raw, to: ORDER_STATUS.PAID },
    ip: null,
  });

  const queuedAttempt = await ensureQueuedFulfillmentAttempt(tx, raw, log);
  log?.info?.(
    {
      requestId,
      traceId,
      stripeEventType,
      stripeEventIdSuffix: String(eventId).slice(-12),
      orderIdSuffix: String(raw).slice(-12),
      statusTransitions: {
        paymentCheckoutStatus: `${paymentStatusBeforePaid}->${PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED}`,
        orderStatus: `${ORDER_STATUS.PENDING}->${ORDER_STATUS.PAID}`,
        fulfillmentAttempt: `attempt#${queuedAttempt?.attemptNumber ?? 1}->${queuedAttempt?.status ?? FULFILLMENT_ATTEMPT_STATUS.QUEUED}`,
      },
      phase1CheckoutPaidFulfillmentQueuedOnly: true,
    },
    'phase1 checkout.session.completed: PAID + fulfillment attempt QUEUED (webhook txn; provider I/O not here)',
  );
  emitPhase1PaymentSucceeded({
    id: raw,
    stripePaymentIntentId: piId,
    orderStatus: ORDER_STATUS.PAID,
    status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
  });
  emitPhase1FulfillmentQueued(
    {
      id: raw,
      stripePaymentIntentId: piId,
      orderStatus: ORDER_STATUS.PAID,
    },
    queuedAttempt,
    { provider: queuedAttempt?.provider ?? null },
  );
  await writeOrderAudit(tx, {
    event: 'payment_completed',
    payload: { orderId: raw },
    ip: null,
  });
  orderIdToScheduleFulfillment = raw;

  await mirrorCanonicalPaymentCheckoutById(tx, raw, log);

  return {
    orderIdToScheduleFulfillment,
    checkoutAmountMismatchOrderId,
    paymentIntentIdsForFeeCapture,
  };
}
