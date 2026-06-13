/**
 * Slim serverless path for `charge.refunded` — mirror post-payment incident without cold Express bootstrap.
 */
import { Prisma } from '@prisma/client';

import { safeSuffix } from '../src/lib/webTopupObservability.js';
import { prisma } from '../src/db.js';
import { writeOrderAudit } from '../src/services/orderAuditService.js';
import {
  applyPhase1ChargeRefunded,
  stripePaymentIntentIdFromObject,
} from '../src/services/phase1StripeChargeIncidents.js';
import {
  isStripeWebhookEventShadowAck,
  setStripeWebhookEventShadowAck,
} from '../src/services/moneyPathRedisRegistry.js';
import { primeSlimServerlessEnv } from './slimReadyEnv.mjs';

/**
 * @param {import('stripe').Stripe.Event} event
 */
export function isChargeRefundedEvent(event) {
  return event?.type === 'charge.refunded';
}

/**
 * @param {import('stripe').Stripe.Event} event
 * @returns {Promise<{
 *   status: string;
 *   stateTransition: string;
 *   latencyMs: number;
 *   stripeEventType: string;
 *   stripeEventIdSuffix: string;
 *   paymentIntentIdSuffix: string | null;
 *   orderIdSuffix: string | null;
 * }>}
 */
export async function slimProcessChargeRefundedWebhook(event) {
  if (process.env.NODE_ENV !== 'production') {
    primeSlimServerlessEnv();
  }

  const t0 = Date.now();
  const stripeEventType = event.type;
  const stripeEventIdSuffix = safeSuffix(event.id, 8);
  const charge = event.data?.object;
  const piId = stripePaymentIntentIdFromObject(charge);
  const paymentIntentIdSuffix = piId ? safeSuffix(piId, 12) : null;

  if (!piId) {
    return {
      status: 'ignored',
      stateTransition: 'no_payment_intent_on_charge',
      latencyMs: Date.now() - t0,
      stripeEventType,
      stripeEventIdSuffix,
      paymentIntentIdSuffix: null,
      orderIdSuffix: null,
    };
  }

  if (await isStripeWebhookEventShadowAck(event.id)) {
    return {
      status: 'duplicate_ignored',
      stateTransition: 'duplicate_shadow_ack',
      latencyMs: Date.now() - t0,
      stripeEventType,
      stripeEventIdSuffix,
      paymentIntentIdSuffix,
      orderIdSuffix: null,
    };
  }

  let stateTransition = 'noop';
  let orderIdSuffix = null;

  try {
    const applyResult = await prisma.$transaction(async (tx) => {
      await tx.stripeWebhookEvent.create({ data: { id: event.id } });
      await writeOrderAudit(tx, {
        event: 'stripe_webhook_received',
        payload: {
          eventType: stripeEventType,
          eventIdSuffix: stripeEventIdSuffix,
        },
        ip: null,
      });
      return applyPhase1ChargeRefunded(tx, charge, event.id);
    });
    void setStripeWebhookEventShadowAck(event.id);

    if (applyResult?.updated > 0 && applyResult.orderId) {
      stateTransition = 'incident_refunded';
      orderIdSuffix = safeSuffix(applyResult.orderId, 10);
    } else {
      stateTransition = 'no_checkout_for_pi';
    }

    return {
      status: applyResult?.updated > 0 ? 'refunded_recorded' : 'unmapped',
      stateTransition,
      latencyMs: Date.now() - t0,
      stripeEventType,
      stripeEventIdSuffix,
      paymentIntentIdSuffix,
      orderIdSuffix,
    };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      void setStripeWebhookEventShadowAck(event.id);
      let replayUpdated = 0;
      let replayOrderId = null;
      try {
        const replay = await prisma.$transaction(async (tx) =>
          applyPhase1ChargeRefunded(tx, charge, event.id),
        );
        replayUpdated = replay?.updated ?? 0;
        replayOrderId = replay?.orderId ?? null;
      } catch {
        stateTransition = 'duplicate_db_replay_failed';
      }
      if (replayUpdated > 0 && replayOrderId) {
        stateTransition = 'incident_refunded_replay';
        orderIdSuffix = safeSuffix(replayOrderId, 10);
      } else {
        stateTransition = 'duplicate_db_idempotent';
      }
      return {
        status: replayUpdated > 0 ? 'refunded_recorded' : 'duplicate_ignored',
        stateTransition,
        latencyMs: Date.now() - t0,
        stripeEventType,
        stripeEventIdSuffix,
        paymentIntentIdSuffix,
        orderIdSuffix,
      };
    }

    return {
      status: 'error_ack',
      stateTransition: 'transaction_error_ack',
      latencyMs: Date.now() - t0,
      stripeEventType,
      stripeEventIdSuffix,
      paymentIntentIdSuffix,
      orderIdSuffix: null,
    };
  }
}
