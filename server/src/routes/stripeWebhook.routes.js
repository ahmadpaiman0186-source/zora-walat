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
import { emitPhase1OperationalEvent } from '../lib/phase1OperationalEvents.js';
import { classifyTransactionFailure } from '../constants/transactionFailureClass.js';
import { transactionRetryDirective } from '../lib/transactionRetryPolicy.js';

const router = Router();

/** Generic responses — no Stripe or stack details to clients. */
const ERR_INVALID = { error: 'Invalid request' };
const ERR_UNAVAILABLE = { error: 'Service unavailable' };

/**
 * Stripe webhook — raw body required for `constructEvent`.
 * Production: `STRIPE_WEBHOOK_SECRET` is required at process startup (see `src/index.js`).
 */
router.post('/', async (req, res) => {
  console.log('📬 WEBHOOK: Stripe route hit');

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
    return res.status(503).json(ERR_UNAVAILABLE);
  }

  const sig = req.headers['stripe-signature'];
  if (!sig || typeof sig !== 'string') {
    console.error('❌ WEBHOOK ERROR:', 'Missing or invalid Stripe-Signature header');
    return res.status(400).json(ERR_INVALID);
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    console.error('❌ WEBHOOK ERROR:', err?.message ?? String(err));
    req.log?.warn(
      { securityEvent: 'stripe_webhook_signature_invalid' },
      'security',
    );
    return res.status(400).send(`Webhook Error: ${err?.message ?? 'Invalid signature'}`);
  }

  console.log('✅ WEBHOOK RECEIVED:', event.type);
  if (event.type === 'payment_intent.succeeded') {
    console.log('💰 PAYMENT SUCCESS:', event.data.object?.id);
  }

  req.log?.info(
    { eventType: event.type, traceId: req.traceId ?? null },
    'stripe webhook',
  );

  if (await isStripeWebhookEventShadowAck(event.id)) {
    recordMoneyPathOpsSignal('stripe_webhook_shadow_fast_ack');
    recordRetry('webhook_event_duplicate_redis_shadow');
    return res.json({ received: true });
  }

  const stripeEventIdSuffix = safeSuffix(event.id, 8);

  let orderIdToScheduleFulfillment = null;
  /** Set when `checkout.session.completed` fails validation vs Stripe totals (possible misconfig or tamper). */
  let checkoutAmountMismatchOrderId = null;
  /** PaymentIntent ids for async actual-fee reconciliation (non-blocking). */
  const paymentIntentIdsForFeeCapture = [];

  try {
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
        await handleWebTopupPaymentIntentSucceeded(tx, event, pi, req.log);
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
    webTopupLog(req.log, 'error', 'webhook_failed', {
      stripeEventType: event.type,
      stripeEventIdSuffix,
      errName: e?.name,
      errCode: e?.code,
      message: typeof e?.message === 'string' ? e.message.slice(0, 200) : undefined,
    });
    throw e;
  }

  for (const piFeeId of new Set(paymentIntentIdsForFeeCapture)) {
    schedulePaymentCheckoutStripeFeeCapture(piFeeId, req.log);
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

  return res.json({ received: true });
});

export default router;
