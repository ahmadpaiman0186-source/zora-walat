/**
 * Slim serverless path for hosted-checkout `checkout.session.expired` (no Express cold start).
 */
import { Prisma } from '@prisma/client';

import { safeSuffix } from '../src/lib/webTopupObservability.js';
import { logStripeWebhookLifecycle } from '../src/lib/stripeWebhookLifecycleLog.js';
import { prisma } from '../src/db.js';
import { writeOrderAudit } from '../src/services/orderAuditService.js';
import {
  applyPhase1CheckoutSessionExpired,
  isHostedCheckoutSessionExpiredEvent,
} from '../src/services/phase1StripeCheckoutSessionExpired.js';
import {
  isStripeWebhookEventShadowAck,
  setStripeWebhookEventShadowAck,
} from '../src/services/moneyPathRedisRegistry.js';
import { primeSlimServerlessEnv } from './slimReadyEnv.mjs';

export { isHostedCheckoutSessionExpiredEvent };

/**
 * @param {import('stripe').Stripe.Event} event
 */
export async function slimProcessCheckoutSessionExpiredWebhook(event) {
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

  logStripeWebhookLifecycle('processing_started', {
    stripeEventType,
    stripeEventIdSuffix,
    orderIdSuffix,
    path: 'slim_checkout_session_expired',
  });

  if (await isStripeWebhookEventShadowAck(event.id)) {
    logStripeWebhookLifecycle('duplicate_event_blocked', {
      stripeEventType,
      stripeEventIdSuffix,
      reason: 'redis_shadow_ack',
    });
    return buildResult({
      status: 'duplicate_ignored',
      stateTransition: 'duplicate_shadow_ack',
      stripeEventType,
      stripeEventIdSuffix,
      orderIdSuffix,
      checkoutSessionIdSuffix,
      latencyMs: Date.now() - t0,
    });
  }

  let stateTransition = 'noop';

  try {
    const applyResult = await prisma.$transaction(async (tx) => {
      await tx.stripeWebhookEvent.create({ data: { id: event.id } });
      logStripeWebhookLifecycle('event_persisted', {
        stripeEventType,
        stripeEventIdSuffix,
        orderIdSuffix,
      });
      await writeOrderAudit(tx, {
        event: 'stripe_webhook_received',
        payload: {
          eventType: stripeEventType,
          eventIdSuffix: stripeEventIdSuffix,
        },
        ip: null,
      });
      return applyPhase1CheckoutSessionExpired(tx, { session, traceId: null, log: null });
    });
    void setStripeWebhookEventShadowAck(event.id);
    stateTransition = applyResult.stateTransition;
    logStripeWebhookLifecycle('processing_completed', {
      stripeEventType,
      stripeEventIdSuffix,
      orderIdSuffix,
      stateTransition,
      latencyMs: Date.now() - t0,
    });
    return buildResult({
      status: applyResult.updated > 0 ? 'cancelled' : 'processed',
      stateTransition,
      stripeEventType,
      stripeEventIdSuffix,
      orderIdSuffix,
      checkoutSessionIdSuffix,
      latencyMs: Date.now() - t0,
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      void setStripeWebhookEventShadowAck(event.id);
      logStripeWebhookLifecycle('duplicate_event_blocked', {
        stripeEventType,
        stripeEventIdSuffix,
        reason: 'db_unique_violation',
      });
      let replayState = 'duplicate_db_idempotent';
      try {
        const replay = await prisma.$transaction(async (tx) =>
          applyPhase1CheckoutSessionExpired(tx, { session, traceId: null, log: null }),
        );
        replayState = replay.stateTransition;
      } catch {
        replayState = 'duplicate_db_replay_failed';
      }
      logStripeWebhookLifecycle('processing_completed', {
        stripeEventType,
        stripeEventIdSuffix,
        orderIdSuffix,
        stateTransition: replayState,
        latencyMs: Date.now() - t0,
      });
      return buildResult({
        status: 'duplicate_ignored',
        stateTransition: replayState,
        stripeEventType,
        stripeEventIdSuffix,
        orderIdSuffix,
        checkoutSessionIdSuffix,
        latencyMs: Date.now() - t0,
      });
    }

    logStripeWebhookLifecycle('processing_failed', {
      stripeEventType,
      stripeEventIdSuffix,
      orderIdSuffix,
      errName: e?.name,
      latencyMs: Date.now() - t0,
    });
    return buildResult({
      status: 'error_ack',
      stateTransition: 'transaction_error_ack',
      stripeEventType,
      stripeEventIdSuffix,
      orderIdSuffix,
      checkoutSessionIdSuffix,
      latencyMs: Date.now() - t0,
    });
  }
}

/** @param {object} p */
function buildResult(p) {
  return p;
}
