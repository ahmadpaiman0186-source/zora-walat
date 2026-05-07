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
import { recordMissionPaymentPaid } from '../infrastructure/observability/phase1MissionObservability.js';
import { emitFortressIdempotencyNoop } from '../lib/transactionFortressIdempotency.js';
import { validatePaymentCheckoutStatusTransition } from '../domain/orders/phase1LifecyclePolicy.js';
import { mirrorCanonicalPaymentCheckoutById } from './canonicalTransactionSync.js';
import {
  PAYMENT_CORE_STATE,
  validateLayer3WebPaidTransition,
} from '../payment/paymentStateMachine.js';
import {
  WEBHOOK_PAYMENT_TRUTH_FAILURE,
  classifyWebhookPaymentTruthFailure,
  validateStripeCheckoutSessionTruth,
} from '../payment/webhookTruthContract.js';
import { postPaymentCapturedLedger } from '../ledger/ledgerService.js';
import { appendPaymentTraceChainHop } from '../lib/paymentTraceChain.js';
import { computePaymentCheckoutTrustScore } from '../lib/paymentCheckoutTrust.js';
import { persistFraudAssessmentInTx } from './fraudDetectionService.js';

/** Rows eligible for `checkout.session.completed` → PAID (matches `updateMany` `status` guard). */
export const PHASE1_CHECKOUT_SESSION_PAID_PRE_STATUSES = [
  PAYMENT_CHECKOUT_STATUS.INITIATED,
  PAYMENT_CHECKOUT_STATUS.PAYMENT_PENDING,
  PAYMENT_CHECKOUT_STATUS.CHECKOUT_CREATED,
];

/**
 * True when a replay may still need `applyPhase1CheckoutSessionCompleted` after the
 * `StripeWebhookEvent` row already exists (first txn committed without PAID).
 *
 * @param {import('@prisma/client').PaymentCheckout | Record<string, unknown> | null | undefined} row
 */
export function paymentCheckoutPendingForPhase1CheckoutSessionPaidReplay(row) {
  if (!row || typeof row !== 'object') return false;
  if (row.userId == null) return false;
  if (String(row.orderStatus ?? '') !== ORDER_STATUS.PENDING) return false;
  const ps = String(row.status ?? '');
  return PHASE1_CHECKOUT_SESSION_PAID_PRE_STATUSES.includes(ps);
}

/**
 * Prefer checkout-time trace carried in Stripe session metadata (`zwTraceId`) so webhook
 * fulfillment correlates with the API request that created the session.
 *
 * @param {object} session
 * @param {string | null | undefined} optsTraceId
 */
export function resolvePhase1CheckoutCorrelationTraceId(session, optsTraceId) {
  const m = session?.metadata;
  const z = m && typeof m.zwTraceId === 'string' ? m.zwTraceId.trim() : '';
  if (z) return z.slice(0, 128);
  if (optsTraceId != null && String(optsTraceId).trim()) {
    return String(optsTraceId).trim().slice(0, 128);
  }
  return null;
}

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
  const traceId = resolvePhase1CheckoutCorrelationTraceId(session, opts.traceId);
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

  const truth = validateStripeCheckoutSessionTruth({
    session,
    order: row,
    stripeEventType,
    traceId,
  });

  if (!truth.ok) {
    const cls = classifyWebhookPaymentTruthFailure(truth.failureClass);
    log?.warn?.(
      {
        event: 'webhook_truth_rejected',
        orderId: raw,
        traceId: traceId ?? null,
        ...truth.audit,
        failureClass: truth.failureClass,
        manualReview: truth.manualReview ?? cls.manualReview,
      },
      'payment_core',
    );

    if (truth.failureClass === WEBHOOK_PAYMENT_TRUTH_FAILURE.DUPLICATE_EVENT) {
      emitFortressIdempotencyNoop('CHECKOUT_SESSION_REPLAY_AFTER_PAID', {
        orderIdSuffix: String(raw).slice(-12),
        orderStatus: row.orderStatus,
      });
      await mirrorCanonicalPaymentCheckoutById(tx, raw, log);
      return {
        orderIdToScheduleFulfillment,
        checkoutAmountMismatchOrderId,
        paymentIntentIdsForFeeCapture,
      };
    }

    if (truth.failureClass === WEBHOOK_PAYMENT_TRUTH_FAILURE.UNPAID_SESSION) {
      await writeOrderAudit(tx, {
        event: 'webhook_truth_manual_review',
        payload: {
          orderId: raw,
          reason: truth.failureClass,
          traceId: traceId ?? null,
        },
        ip: null,
      });
      await mirrorCanonicalPaymentCheckoutById(tx, raw, log);
      return {
        orderIdToScheduleFulfillment,
        checkoutAmountMismatchOrderId,
        paymentIntentIdsForFeeCapture,
      };
    }

    if (truth.failureClass === WEBHOOK_PAYMENT_TRUTH_FAILURE.STRIPE_SESSION_MISMATCH) {
      const ir = truth.audit?.integrityReason;
      if (ir === 'stripe_checkout_session_id_mismatch' && row.orderStatus === ORDER_STATUS.PENDING) {
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
              traceId: traceId ?? null,
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

    if (
      truth.failureClass === WEBHOOK_PAYMENT_TRUTH_FAILURE.AMOUNT_MISMATCH ||
      truth.failureClass === WEBHOOK_PAYMENT_TRUTH_FAILURE.CURRENCY_MISMATCH
    ) {
      checkoutAmountMismatchOrderId = raw;
      const total = session.amount_total;
      const sessionCurrency = String(session.currency ?? 'usd').toLowerCase();
      const rowCurrency = String(row.currency ?? 'usd').toLowerCase();
      log?.error?.(
        {
          expectedCents: row.amountUsdCents,
          stripeTotal: total,
          expectedCurrency: rowCurrency,
          stripeCurrency: sessionCurrency,
        },
        'stripe webhook: amount or currency mismatch (webhook truth)',
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
          await mirrorCanonicalPaymentCheckoutById(tx, raw, log);
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
            traceId: traceId ?? null,
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

    await mirrorCanonicalPaymentCheckoutById(tx, raw, log);
    return {
      orderIdToScheduleFulfillment,
      checkoutAmountMismatchOrderId,
      paymentIntentIdsForFeeCapture,
    };
  }

  log?.info?.(
    {
      event: 'webhook_truth_validated',
      orderId: raw,
      traceId: traceId ?? null,
      ...truth.audit,
    },
    'payment_core',
  );

  const stripeSessionId = truth.stripeSessionId;

  log?.info?.(
    {
      event: 'checkout_webhook_phase1_preflight',
      checkoutId: raw,
      dbOrderStatus: row.orderStatus,
      dbPaymentCheckoutStatus: row.status,
      sessionMode: String(session.mode ?? ''),
      sessionPaymentStatus: String(session.payment_status ?? ''),
      stripeEventId: eventId,
      traceId: traceId ?? null,
    },
    'payment_core',
  );

  const l3PaidGate = validateLayer3WebPaidTransition(row);
  if (!l3PaidGate.ok) {
    log?.warn?.(
      {
        event: 'payment_transition',
        result: 'denied',
        reason: l3PaidGate.reason,
        from: l3PaidGate.from,
        to: PAYMENT_CORE_STATE.PAID,
        eventId,
        checkoutId: raw,
        securityEvent: 'payment_l3_webhook_paid_denied',
        orderIdSuffix: String(raw).slice(-12),
      },
      'security',
    );
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
        event: 'payment_transition',
        result: 'denied',
        reason: payToSucceeded.denial,
        detail: payToSucceeded.detail,
        from: paymentStatusBeforePaid,
        to: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
        eventId,
        checkoutId: raw,
        fortressDenial: payToSucceeded.denial,
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
      status: { in: PHASE1_CHECKOUT_SESSION_PAID_PRE_STATUSES },
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
    log?.warn?.(
      {
        event: 'payment_transition',
        result: 'denied',
        reason: 'update_many_noop',
        from: l3PaidGate.from,
        to: PAYMENT_CORE_STATE.PAID,
        eventId,
        checkoutId: raw,
        dbOrderStatus: row.orderStatus,
        dbPaymentCheckoutStatus: row.status,
        traceId: traceId ?? null,
      },
      'payment_core',
    );
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

  log?.info?.(
    {
      event: 'payment_transition',
      result: 'success',
      from: l3PaidGate.from,
      to: PAYMENT_CORE_STATE.PAID,
      eventId,
      checkoutId: raw,
      orderId: raw,
      traceId: traceId ?? null,
    },
    'payment_core',
  );

  try {
    await postPaymentCapturedLedger(tx, {
      checkoutId: raw,
      stripeEventId: eventId,
      amountUsdCents: row.amountUsdCents,
    });
  } catch (ledgerErr) {
    log?.error?.(
      {
        event: 'ledger_payment_post_failed',
        checkoutId: raw,
        stripeEventId: eventId,
        errName: ledgerErr?.name,
        message:
          typeof ledgerErr?.message === 'string'
            ? ledgerErr.message.slice(0, 200)
            : undefined,
      },
      'payment_core',
    );
    throw ledgerErr;
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
    payload: {
      orderId: raw,
      to: ORDER_STATUS.PAID,
      traceId: traceId ?? null,
    },
    ip: null,
  });

  const queuedAttempt = await ensureQueuedFulfillmentAttempt(tx, raw, log);

  const snap = await tx.paymentCheckout.findUnique({
    where: { id: raw },
    select: {
      metadata: true,
      status: true,
      orderStatus: true,
      completedByWebhookEventId: true,
      reconciliationStatus: true,
      providerTruthStatus: true,
    },
  });
  if (snap) {
    const meta = appendPaymentTraceChainHop(snap.metadata, {
      stage: 'webhook.checkout_session_completed',
      traceId,
      requestId,
    });
    const trustScore = computePaymentCheckoutTrustScore({
      status: snap.status,
      orderStatus: snap.orderStatus,
      completedByWebhookEventId: snap.completedByWebhookEventId,
      providerTruthStatus: snap.providerTruthStatus,
      reconciliationStatus: snap.reconciliationStatus,
    });
    await tx.paymentCheckout.update({
      where: { id: raw },
      data: { metadata: meta, trustScore },
    });
    try {
      await persistFraudAssessmentInTx(tx, raw, { traceId });
    } catch (fErr) {
      log?.warn?.(
        {
          fraudAssessmentPersistFailed: true,
          checkoutId: raw,
          message: String(fErr?.message ?? fErr).slice(0, 200),
        },
        'fraud_detection',
      );
    }
  }

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
  recordMissionPaymentPaid(raw, traceId, String(eventId).slice(-8));
  emitPhase1PaymentSucceeded(
    {
      id: raw,
      stripePaymentIntentId: piId,
      orderStatus: ORDER_STATUS.PAID,
      status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
    },
    { traceId: traceId ?? null },
  );
  emitPhase1FulfillmentQueued(
    {
      id: raw,
      stripePaymentIntentId: piId,
      orderStatus: ORDER_STATUS.PAID,
    },
    queuedAttempt,
    { provider: queuedAttempt?.provider ?? null, traceId: traceId ?? null },
  );
  await writeOrderAudit(tx, {
    event: 'payment_completed',
    payload: { orderId: raw, traceId: traceId ?? null },
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
