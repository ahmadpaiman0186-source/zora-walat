/**
 * Slim serverless path for hosted-checkout `checkout.session.completed` (no Express cold start).
 */
import { Prisma } from '@prisma/client';

import { env } from '../src/config/env.js';
import { isLikelyPaymentCheckoutId } from '../src/lib/paymentCheckoutId.js';
import { safeSuffix } from '../src/lib/webTopupObservability.js';
import { prisma } from '../src/db.js';
import { writeOrderAudit } from '../src/services/orderAuditService.js';
import {
  applyPhase1CheckoutSessionCompleted,
  paymentCheckoutPendingForPhase1CheckoutSessionPaidReplay,
  resolvePhase1CheckoutCorrelationTraceId,
} from '../src/services/phase1StripeCheckoutSessionCompleted.js';
import { scheduleFulfillmentProcessing } from '../src/services/fulfillmentProcessingService.js';
import { schedulePaymentCheckoutStripeFeeCapture } from '../src/services/paymentCheckoutStripeFeeService.js';
import {
  isStripeWebhookEventShadowAck,
  setStripeWebhookEventShadowAck,
} from '../src/services/moneyPathRedisRegistry.js';
import { primeSlimServerlessEnv } from './slimReadyEnv.mjs';

const noopLog = {
  info() {},
  warn() {},
  error() {},
  child() {
    return noopLog;
  },
};

/**
 * @param {import('stripe').Stripe.Event} event
 */
export function isHostedCheckoutSessionCompletedEvent(event) {
  if (event?.type !== 'checkout.session.completed') return false;
  const session = event.data?.object;
  if (!session || typeof session !== 'object') return false;
  const raw = session.metadata?.internalCheckoutId;
  if (raw == null || String(raw).trim() === '') return false;
  return isLikelyPaymentCheckoutId(String(raw));
}

/**
 * @param {import('stripe').Stripe.Event} event
 * @returns {Promise<{
 *   status: string;
 *   latencyMs: number;
 *   stripeEventType: string;
 *   stripeEventIdSuffix: string;
 *   orderIdSuffix: string | null;
 *   checkoutSessionIdSuffix: string | null;
 *   paymentIntentIdSuffix: string | null;
 *   stateTransition: string;
 *   orderIdToScheduleFulfillment: string | null;
 * }>}
 */
export async function slimProcessCheckoutSessionCompletedWebhook(event) {
  if (process.env.NODE_ENV !== 'production') {
    primeSlimServerlessEnv();
  }

  const t0 = Date.now();
  const stripeEventType = event.type;
  const stripeEventIdSuffix = safeSuffix(event.id, 8);
  const session = event.data.object;
  const orderId = String(session.metadata.internalCheckoutId);
  const orderIdSuffix = safeSuffix(orderId, 10);
  const checkoutSessionIdSuffix =
    typeof session.id === 'string' ? safeSuffix(session.id, 12) : null;
  const traceId = resolvePhase1CheckoutCorrelationTraceId(session, null);

  let orderIdToScheduleFulfillment = null;
  const paymentIntentIdsForFeeCapture = [];
  let stateTransition = 'noop';

  if (await isStripeWebhookEventShadowAck(event.id)) {
    const row = await prisma.paymentCheckout.findUnique({
      where: { id: orderId },
      select: { userId: true, orderStatus: true, status: true },
    });
    if (!paymentCheckoutPendingForPhase1CheckoutSessionPaidReplay(row)) {
      stateTransition = 'duplicate_shadow_ack';
      logSlimWebhookCheckout({
        stripeEventType,
        stripeEventIdSuffix,
        orderIdSuffix,
        checkoutSessionIdSuffix,
        paymentIntentIdSuffix: null,
        stateTransition,
        latencyMs: Date.now() - t0,
      });
      return buildResult({
        status: 'duplicate_ignored',
        stateTransition,
        stripeEventType,
        stripeEventIdSuffix,
        orderIdSuffix,
        checkoutSessionIdSuffix,
        paymentIntentIdSuffix: null,
        orderIdToScheduleFulfillment: null,
        latencyMs: Date.now() - t0,
      });
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.stripeWebhookEvent.create({ data: { id: event.id } });
      await writeOrderAudit(tx, {
        event: 'stripe_webhook_received',
        payload: {
          eventType: stripeEventType,
          eventIdSuffix: stripeEventIdSuffix,
          traceId,
        },
        ip: null,
      });
      const r = await applyPhase1CheckoutSessionCompleted(tx, {
        eventId: event.id,
        session,
        log: noopLog,
        traceId,
        requestId: traceId,
        stripeEventType,
      });
      if (r.orderIdToScheduleFulfillment) {
        orderIdToScheduleFulfillment = r.orderIdToScheduleFulfillment;
        stateTransition = 'pending_to_paid';
      } else if (r.checkoutAmountMismatchOrderId) {
        stateTransition = 'amount_mismatch';
      } else {
        stateTransition = 'no_paid_transition';
      }
      for (const pi of r.paymentIntentIdsForFeeCapture) {
        paymentIntentIdsForFeeCapture.push(pi);
      }
    });
    void setStripeWebhookEventShadowAck(event.id);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      stateTransition = 'duplicate_db_idempotent';
      void setStripeWebhookEventShadowAck(event.id);
      const rowForReplay = await prisma.paymentCheckout.findUnique({
        where: { id: orderId },
      });
      if (paymentCheckoutPendingForPhase1CheckoutSessionPaidReplay(rowForReplay)) {
        try {
          const r = await prisma.$transaction(async (tx) =>
            applyPhase1CheckoutSessionCompleted(tx, {
              eventId: event.id,
              session,
              log: noopLog,
              traceId,
              requestId: traceId,
              stripeEventType,
            }),
          );
          if (r.orderIdToScheduleFulfillment) {
            orderIdToScheduleFulfillment = r.orderIdToScheduleFulfillment;
            stateTransition = 'pending_to_paid_replay';
          }
          for (const pi of r.paymentIntentIdsForFeeCapture) {
            paymentIntentIdsForFeeCapture.push(pi);
          }
        } catch {
          stateTransition = 'duplicate_db_replay_failed';
        }
      }
    } else {
      stateTransition = 'transaction_error_ack';
      logSlimWebhookCheckout({
        stripeEventType,
        stripeEventIdSuffix,
        orderIdSuffix,
        checkoutSessionIdSuffix,
        paymentIntentIdSuffix: null,
        stateTransition,
        latencyMs: Date.now() - t0,
        errName: e?.name,
      });
      return buildResult({
        status: 'error_ack',
        stateTransition,
        stripeEventType,
        stripeEventIdSuffix,
        orderIdSuffix,
        checkoutSessionIdSuffix,
        paymentIntentIdSuffix: null,
        orderIdToScheduleFulfillment: null,
        latencyMs: Date.now() - t0,
      });
    }
  }

  const piId =
    paymentIntentIdsForFeeCapture.length > 0
      ? paymentIntentIdsForFeeCapture[0]
      : null;
  const paymentIntentIdSuffix = piId ? safeSuffix(piId, 12) : null;

  logSlimWebhookCheckout({
    stripeEventType,
    stripeEventIdSuffix,
    orderIdSuffix,
    checkoutSessionIdSuffix,
    paymentIntentIdSuffix,
    stateTransition,
    latencyMs: Date.now() - t0,
  });

  queuePostCommitSideEffects({
    orderIdToScheduleFulfillment,
    paymentIntentIdsForFeeCapture,
    traceId,
  });

  return buildResult({
    status: orderIdToScheduleFulfillment ? 'paid' : 'processed',
    stateTransition,
    stripeEventType,
    stripeEventIdSuffix,
    orderIdSuffix,
    checkoutSessionIdSuffix,
    paymentIntentIdSuffix,
    orderIdToScheduleFulfillment,
    latencyMs: Date.now() - t0,
  });
}

/**
 * @param {object} p
 */
function buildResult(p) {
  return p;
}

/**
 * @param {object} fields
 */
function logSlimWebhookCheckout(fields) {
  console.log(
    JSON.stringify({
      event: 'webhook_slim_checkout_session_completed',
      schema: 'zora.webhook_slim_checkout.v1',
      t: new Date().toISOString(),
      ...fields,
    }),
  );
}

/**
 * @param {{ orderIdToScheduleFulfillment: string | null, paymentIntentIdsForFeeCapture: string[], traceId: string | null }} p
 */
function queuePostCommitSideEffects(p) {
  const { orderIdToScheduleFulfillment, paymentIntentIdsForFeeCapture, traceId } =
    p;
  setImmediate(() => {
    for (const piId of new Set(paymentIntentIdsForFeeCapture)) {
      schedulePaymentCheckoutStripeFeeCapture(piId, noopLog);
    }
    if (
      orderIdToScheduleFulfillment &&
      !env.phase1WebhookSkipFulfillmentDispatch
    ) {
      scheduleFulfillmentProcessing(orderIdToScheduleFulfillment, traceId);
    }
  });
}
