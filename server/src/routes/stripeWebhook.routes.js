import { Router } from 'express';

import { env } from '../config/env.js';
import { getStripeClient } from '../services/stripe.js';
import { prisma, Prisma } from '../db.js';
import { PAYMENT_CHECKOUT_STATUS } from '../constants/paymentCheckoutStatus.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { isLikelyPaymentCheckoutId } from '../lib/paymentCheckoutId.js';
import { assertTransition } from '../domain/orders/orderLifecycle.js';
import { writeOrderAudit } from '../services/orderAuditService.js';
import { scheduleFulfillmentProcessing } from '../services/fulfillmentProcessingService.js';
import {
  emitPaymentSuccessSideEffect,
  schedulePushSideEffect,
} from '../services/pushNotifications/userNotificationPipeline.js';
import {
  handleWebTopupPaymentIntentFailed,
  handleWebTopupPaymentIntentSucceeded,
} from '../services/topupOrder/webtopupWebhookHandlers.js';
import { scheduleWebTopupFulfillmentAfterPaid } from '../services/topupFulfillment/webTopupFulfillmentService.js';
import { safeSuffix, webTopupLog } from '../lib/webTopupObservability.js';
import {
  recordPaymentCheckoutOutcome,
  bumpCounter,
  recordRetry,
  recordMoneyPathOpsSignal,
} from '../lib/opsMetrics.js';
import {
  isStripeWebhookEventShadowAck,
  setStripeWebhookEventShadowAck,
} from '../services/moneyPathRedisRegistry.js';
import {
  evaluateRollingAlerts,
  emitProviderDegradationAlert,
} from '../lib/opsAlerts.js';
import { logOpsEvent } from '../lib/opsLog.js';
import { schedulePaymentCheckoutStripeFeeCapture } from '../services/paymentCheckoutStripeFeeService.js';
import { applyPhase1CheckoutSessionCompleted } from '../services/phase1StripeCheckoutSessionCompleted.js';
import {
  applyPhase1ChargeRefunded,
  applyPhase1DisputeCreated,
} from '../services/phase1StripeChargeIncidents.js';
import { MONEY_PATH_EVENT } from '../domain/payments/moneyPathEvents.js';
import { emitMoneyPathLog } from '../infrastructure/logging/moneyPathLog.js';
import { emitPhase1OperationalEvent } from '../lib/phase1OperationalEvents.js';
import { classifyTransactionFailure } from '../constants/transactionFailureClass.js';
import { transactionRetryDirective } from '../lib/transactionRetryPolicy.js';
import { enrichReliabilityDecisionWithSeverity } from '../services/reliability/failureSeverity.js';
import { recordReliabilityDecision } from '../services/reliability/watchdog.js';
import { API_CONTRACT_CODE } from '../constants/apiContractCodes.js';
import { clientErrorBody } from '../lib/clientErrorJson.js';

const router = Router();

/**
 * Stripe webhook — raw body required for `constructEvent`.
 * Production: `STRIPE_WEBHOOK_SECRET` is required at process startup (see `src/index.js`).
 */
router.post('/', async (req, res) => {
  emitMoneyPathLog(MONEY_PATH_EVENT.WEBHOOK_HTTP_RECEIVED, {
    traceId: req.traceId ?? null,
  });

  const stripe = getStripeClient();
  const secret = env.stripeWebhookSecret;
  if (!stripe || !secret) {
    console.error(
      '❌ WEBHOOK ERROR: Stripe client or STRIPE_WEBHOOK_SECRET not configured. Run: stripe listen --forward-to http://127.0.0.1:8787/webhooks/stripe — then paste whsec_ into server/.env as STRIPE_WEBHOOK_SECRET, save the file, restart the server.',
    );
    req.log?.warn(
      { securityEvent: 'webhook_not_configured' },
      'security',
    );
    return res
      .status(503)
      .json(
        clientErrorBody(
          'Service unavailable',
          API_CONTRACT_CODE.INTERNAL_ERROR,
        ),
      );
  }

  const sig = req.headers['stripe-signature'];
  if (!sig || typeof sig !== 'string') {
    console.error('❌ WEBHOOK ERROR:', 'Missing or invalid Stripe-Signature header');
    return res
      .status(400)
      .json(
        clientErrorBody('Invalid request', API_CONTRACT_CODE.VALIDATION_ERROR),
      );
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
    /** Dev-only: grep-friendly signature-verification proof (Stripe event ids only). */
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        '[stripe_webhook_proof]',
        JSON.stringify({ eventType: event.type, eventId: event.id }),
      );
    }
    emitMoneyPathLog(MONEY_PATH_EVENT.WEBHOOK_VERIFIED, {
      traceId: req.traceId ?? null,
      stripeEventType: event.type,
      stripeEventIdSuffix: safeSuffix(event.id, 8),
    });
  } catch (err) {
    const body = req.body;
    const bodyLen = Buffer.isBuffer(body)
      ? body.length
      : typeof body === 'string'
        ? body.length
        : body == null
          ? 0
          : null;
    emitMoneyPathLog(MONEY_PATH_EVENT.WEBHOOK_VERIFY_FAILED, {
      traceId: req.traceId ?? null,
      stripeWebhookSignatureInvalid: true,
      bodyKind: Buffer.isBuffer(body)
        ? 'Buffer'
        : body == null
          ? 'missing'
          : typeof body,
      bodyLength: bodyLen,
      message: String(err?.message ?? err).slice(0, 200),
    });
    req.log?.warn(
      { securityEvent: 'stripe_webhook_signature_invalid' },
      'security',
    );
    return res.status(400).send(`Webhook Error: ${err?.message ?? 'Invalid signature'}`);
  }

  const stripeEventIdSuffix = safeSuffix(event.id, 8);
  webTopupLog(req.log, 'info', 'webhook_received', {
    stripeEventType: event.type,
    stripeEventIdSuffix,
    traceId: req.traceId ?? null,
  });

  if (await isStripeWebhookEventShadowAck(event.id)) {
    recordMoneyPathOpsSignal('stripe_webhook_shadow_fast_ack');
    recordRetry('webhook_event_duplicate_redis_shadow');
    webTopupLog(req.log, 'info', 'webhook_duplicate_ignored', {
      reason: 'redis_shadow_ack',
      stripeEventType: event.type,
      stripeEventIdSuffix,
    });
    return res.json({ received: true });
  }

  let orderIdToScheduleFulfillment = null;
  /** First `payment_intent.succeeded` transition to paid for a WebTopupOrder — auto-dispatch after tx. */
  let webTopupOrderIdToAutoFulfill = null;
  /** Set when `checkout.session.completed` fails validation vs Stripe totals (possible misconfig or tamper). */
  let checkoutAmountMismatchOrderId = null;
  /** PaymentIntent ids for async actual-fee reconciliation (non-blocking). */
  const paymentIntentIdsForFeeCapture = [];

  try {
    webTopupLog(req.log, 'info', 'webhook_processing_started', {
      stripeEventType: event.type,
      stripeEventIdSuffix,
      traceId: req.traceId ?? null,
    });
    await prisma.$transaction(async (tx) => {
      await tx.stripeWebhookEvent.create({ data: { id: event.id } });

      await writeOrderAudit(tx, {
        event: 'stripe_webhook_received',
        payload: {
          eventType: event.type,
          eventIdSuffix: String(event.id).slice(-8),
        },
        ip: null,
      });

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const r = await applyPhase1CheckoutSessionCompleted(tx, {
          eventId: event.id,
          session,
          log: req.log,
        });
        if (r.orderIdToScheduleFulfillment) {
          orderIdToScheduleFulfillment = r.orderIdToScheduleFulfillment;
        }
        if (r.checkoutAmountMismatchOrderId) {
          checkoutAmountMismatchOrderId = r.checkoutAmountMismatchOrderId;
        }
        for (const pi of r.paymentIntentIdsForFeeCapture) {
          paymentIntentIdsForFeeCapture.push(pi);
        }
        return;
      }

      if (event.type === 'payment_intent.succeeded') {
        const pi = event.data.object;
        const webTopupPi = await handleWebTopupPaymentIntentSucceeded(
          tx,
          event,
          pi,
          req.log,
          { traceId: req.traceId ?? null },
        );
        if (webTopupPi?.scheduleWebTopupFulfillment) {
          webTopupOrderIdToAutoFulfill = webTopupPi.scheduleWebTopupFulfillment;
        }
        const piId =
          pi && typeof pi.id === 'string' && pi.id.startsWith('pi_')
            ? pi.id
            : null;
        const topupMeta = pi?.metadata?.topup_order_id;
        const isWebTopupOrderMeta =
          typeof topupMeta === 'string' && /^tw_ord_[0-9a-f-]{36}$/i.test(topupMeta);
        if (piId && !isWebTopupOrderMeta) {
          paymentIntentIdsForFeeCapture.push(piId);
        }
        return;
      }

      if (event.type === 'payment_intent.payment_failed') {
        const pi = event.data.object;
        await handleWebTopupPaymentIntentFailed(tx, pi, req.log);
        return;
      }

      if (event.type === 'checkout.session.expired') {
        const session = event.data.object;
        const raw = session.metadata?.internalCheckoutId;
        if (!raw || !isLikelyPaymentCheckoutId(raw)) {
          if (raw && !isLikelyPaymentCheckoutId(raw)) {
            req.log?.warn(
              { securityEvent: 'webhook_invalid_metadata_shape' },
              'security',
            );
          }
          return;
        }
        const row = await tx.paymentCheckout.findUnique({
          where: { id: raw },
          select: { orderStatus: true },
        });
        if (!row || row.orderStatus !== ORDER_STATUS.PENDING) {
          return;
        }
        assertTransition(row.orderStatus, ORDER_STATUS.CANCELLED);
        await tx.paymentCheckout.updateMany({
          where: {
            id: raw,
            orderStatus: ORDER_STATUS.PENDING,
          },
          data: {
            orderStatus: ORDER_STATUS.CANCELLED,
            status: PAYMENT_CHECKOUT_STATUS.PAYMENT_FAILED,
            cancelledAt: new Date(),
            failureReason: 'checkout_session_expired',
          },
        });
        await writeOrderAudit(tx, {
          event: 'order_status_changed',
          payload: { orderId: raw, to: ORDER_STATUS.CANCELLED },
          ip: null,
        });
        return;
      }

      if (event.type === 'charge.refunded') {
        const charge = event.data.object;
        await applyPhase1ChargeRefunded(tx, charge, event.id);
        return;
      }

      if (event.type === 'charge.dispute.created') {
        const dispute = event.data.object;
        await applyPhase1DisputeCreated(tx, dispute, event.id, {
          stripe,
          log: req.log,
        });
        return;
      }
    });

    bumpCounter('webhook_transaction_committed_total');
    void setStripeWebhookEventShadowAck(event.id).then((r) => {
      if (r?.ok === true) {
        recordMoneyPathOpsSignal('stripe_webhook_shadow_set_ok');
      } else {
        recordMoneyPathOpsSignal('stripe_webhook_shadow_set_unavailable');
      }
    });
    webTopupLog(req.log, 'info', 'webhook_processing_completed', {
      stripeEventType: event.type,
      stripeEventIdSuffix,
      traceId: req.traceId ?? null,
    });
    emitPhase1OperationalEvent('webhook_processed', {
      stripeEventType: event.type,
      traceId: req.traceId ?? null,
      stripeEventIdSuffix,
    });
    webTopupLog(req.log, 'info', 'webhook_processed', {
      stripeEventType: event.type,
      stripeEventIdSuffix,
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      recordRetry('webhook_event_duplicate');
      recordMoneyPathOpsSignal('stripe_webhook_db_idempotent_replay');
      void setStripeWebhookEventShadowAck(event.id).then((r) => {
        if (r?.ok === true) recordMoneyPathOpsSignal('stripe_webhook_shadow_repaired_after_p2002');
      });
      emitPhase1OperationalEvent('webhook_duplicate_replay', {
        stripeEventType: event.type,
        traceId: req.traceId ?? null,
        stripeEventIdSuffix,
      });
      webTopupLog(req.log, 'info', 'webhook_duplicate_ignored', {
        reason: 'db_unique_violation',
        stripeEventType: event.type,
        stripeEventIdSuffix,
        prismaCode: 'P2002',
      });
      return res.json({ received: true });
    }
    bumpCounter('stripe_webhook_transaction_failed');
    const failureClass = classifyTransactionFailure(e, {
      surface: 'stripe_webhook',
      stripeEventType: event.type,
    });
    const retryDirective = transactionRetryDirective(failureClass, { attempt: 0 });
    recordReliabilityDecision(
      enrichReliabilityDecisionWithSeverity(
        {
          layer: 'stripe_webhook',
          traceId: req.traceId ?? null,
          outcome: 'transaction_failed',
          stripeEventType: event.type,
          stripeEventIdSuffix,
          transactionFailureClass: failureClass,
          retryMaySchedule: retryDirective.mayScheduleRetry,
          prismaCode: e?.code ?? null,
        },
        e,
        { inDbTransaction: true },
      ),
    );
    emitMoneyPathLog(MONEY_PATH_EVENT.RETRY_DECISION, {
      traceId: req.traceId ?? null,
      surface: 'stripe_webhook',
      stripeEventType: event.type,
      stripeEventIdSuffix,
      transactionFailureClass: failureClass,
      retryMaySchedule: retryDirective.mayScheduleRetry,
      retryReason: retryDirective.reason,
    });
    emitPhase1OperationalEvent('webhook_transaction_failed', {
      stripeEventType: event.type,
      traceId: req.traceId ?? null,
      stripeEventIdSuffix,
      errName: e?.name,
      prismaCode: e?.code,
      transactionFailureClass: failureClass,
      retryMaySchedule: retryDirective.mayScheduleRetry,
      retryReason: retryDirective.reason,
      retrySuggestedBackoffMs: retryDirective.suggestedBackoffMs,
    });
    logOpsEvent({
      domain: 'stripe_webhook',
      event: 'webhook_transaction',
      outcome: 'error',
      traceId: req.traceId,
      extra: {
        stripeEventType: event.type,
        stripeEventIdSuffix,
        errName: e?.name,
        prismaCode: e?.code,
      },
    });
    webTopupLog(req.log, 'error', 'webhook_processing_failed', {
      stripeEventType: event.type,
      stripeEventIdSuffix,
      phase: 'db_transaction',
      errName: e?.name,
      errCode: e?.code,
      message: typeof e?.message === 'string' ? e.message.slice(0, 200) : undefined,
    });
    webTopupLog(req.log, 'error', 'webhook_failed', {
      stripeEventType: event.type,
      stripeEventIdSuffix,
      errName: e?.name,
      errCode: e?.code,
      message: typeof e?.message === 'string' ? e.message.slice(0, 200) : undefined,
    });
    return res.status(200).json({ received: true });
  }

  try {
    for (const piFeeId of new Set(paymentIntentIdsForFeeCapture)) {
      schedulePaymentCheckoutStripeFeeCapture(piFeeId, req.log);
    }

    if (webTopupOrderIdToAutoFulfill) {
      scheduleWebTopupFulfillmentAfterPaid(webTopupOrderIdToAutoFulfill, req.log, {
        traceId: req.traceId ?? null,
      });
      webTopupLog(req.log, 'info', 'webtop_fulfillment_auto_scheduled', {
        orderIdSuffix: webTopupOrderIdToAutoFulfill.slice(-8),
        traceId: req.traceId ?? null,
      });
    }

    if (orderIdToScheduleFulfillment) {
      recordPaymentCheckoutOutcome(true);
      bumpCounter('checkout_paid_phase1_total');
      emitPhase1OperationalEvent('checkout_paid', {
        traceId: req.traceId ?? null,
        orderIdSuffix: safeSuffix(orderIdToScheduleFulfillment, 10),
      });
      logOpsEvent({
        domain: 'stripe_webhook',
        event: 'checkout.session.completed',
        outcome: 'paid',
        orderId: orderIdToScheduleFulfillment,
        traceId: req.traceId,
      });
      evaluateRollingAlerts();
      scheduleFulfillmentProcessing(orderIdToScheduleFulfillment, req.traceId);
      schedulePushSideEffect(
        () => emitPaymentSuccessSideEffect(orderIdToScheduleFulfillment),
        req.traceId,
      );
    } else if (checkoutAmountMismatchOrderId) {
      recordPaymentCheckoutOutcome(false);
      emitProviderDegradationAlert('stripe_amount_currency_mismatch', {
        orderIdSuffix: safeSuffix(checkoutAmountMismatchOrderId, 12),
      });
      logOpsEvent({
        domain: 'stripe_webhook',
        event: 'checkout.session.completed',
        outcome: 'amount_mismatch',
        orderId: checkoutAmountMismatchOrderId,
        traceId: req.traceId,
      });
      evaluateRollingAlerts();
    }

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object;
      const piId =
        pi && typeof pi.id === 'string' && pi.id.startsWith('pi_') ? pi.id : null;
      emitMoneyPathLog(MONEY_PATH_EVENT.PAYMENT_CONFIRMED, {
        traceId: req.traceId ?? null,
        stripeEventIdSuffix: safeSuffix(event.id, 8),
        paymentIntentIdSuffix: piId ? piId.slice(-12) : null,
      });
    }

    return res.json({ received: true });
  } catch (postErr) {
    webTopupLog(req.log, 'error', 'webhook_processing_failed', {
      stripeEventType: event.type,
      stripeEventIdSuffix,
      phase: 'post_commit',
      errName: postErr?.name,
      errCode: postErr?.code,
      message:
        typeof postErr?.message === 'string'
          ? postErr.message.slice(0, 200)
          : undefined,
    });
    return res.status(200).json({ received: true });
  }
});

export default router;
