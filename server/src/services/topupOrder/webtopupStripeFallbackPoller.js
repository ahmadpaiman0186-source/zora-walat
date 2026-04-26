/**
 * WebTopup Stripe fallback: when `payment_intent.succeeded` webhooks are lost/delayed,
 * periodically poll Stripe for pending orders with a linked PaymentIntent and apply the
 * same transactional handler as the webhook (idempotent; no duplicate fulfillment).
 */
import { PAYMENT_STATUS } from '../../domain/topupOrder/statuses.js';
import { env } from '../../config/env.js';
import { prisma } from '../../db.js';
import { safeSuffix, webTopupLog } from '../../lib/webTopupObservability.js';
import { getStripeClient } from '../stripe.js';
import { orchestrateStripeCall } from '../reliability/reliabilityOrchestrator.js';
import { handleWebTopupPaymentIntentSucceeded } from './webtopupWebhookHandlers.js';
import { scheduleWebTopupFulfillmentAfterPaid } from '../topupFulfillment/webTopupFulfillmentService.js';

/** @param {string} paymentIntentId */
export function fallbackSyntheticStripeEventId(paymentIntentId) {
  const safe = String(paymentIntentId).replace(/[^a-zA-Z0-9_]/g, '_');
  return `evt_zw_fallback_${safe}`;
}

/**
 * @param {import('stripe').Stripe.PaymentIntent} pi
 */
function buildSyntheticSucceededEvent(pi) {
  return {
    id: fallbackSyntheticStripeEventId(pi.id),
    type: 'payment_intent.succeeded',
    object: 'event',
  };
}

/**
 * @param {{
 *   log?: import('pino').Logger;
 *   limit?: number;
 *   retrievePaymentIntent?: (paymentIntentId: string) => Promise<import('stripe').Stripe.PaymentIntent | null>;
 *   forceRun?: boolean;
 *   minOrderAgeMs?: number;
 * }} [opts]
 */
export async function runWebTopupStripeFallbackPoller(opts = {}) {
  const enabled = env.webtopupStripeFallbackEnabled || opts.forceRun === true;
  if (!enabled) {
    return { ran: false, reason: 'disabled', processed: 0, candidates: 0 };
  }

  const log = opts.log;
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
  const delayMs =
    typeof opts.minOrderAgeMs === 'number' && Number.isFinite(opts.minOrderAgeMs)
      ? Math.max(0, opts.minOrderAgeMs)
      : env.webtopupStripeFallbackDelayMs;
  const cutoff = new Date(Date.now() - delayMs);

  const stripe = getStripeClient();
  if (!stripe && typeof opts.retrievePaymentIntent !== 'function') {
    webTopupLog(log, 'warn', 'fallback_poller_skipped', {
      reason: 'stripe_client_unavailable',
    });
    return { ran: false, reason: 'no_stripe', processed: 0, candidates: 0 };
  }

  const retrievePi =
    typeof opts.retrievePaymentIntent === 'function'
      ? opts.retrievePaymentIntent
      : async (paymentIntentId) =>
          orchestrateStripeCall({
            operationName: 'paymentIntents.retrieve.fallback_poller',
            traceId: null,
            log,
            fn: () => stripe.paymentIntents.retrieve(paymentIntentId),
          });

  const candidates = await prisma.webTopupOrder.findMany({
    where: {
      paymentStatus: PAYMENT_STATUS.PENDING,
      paymentIntentId: { not: null },
      createdAt: { lt: cutoff },
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  let processed = 0;

  for (const order of candidates) {
    const piId = order.paymentIntentId;
    if (!piId || typeof piId !== 'string') continue;

    try {
      const pi = await retrievePi(piId);
      if (!pi || pi.status !== 'succeeded') continue;

      webTopupLog(log, 'info', 'fallback_payment_detected', {
        orderIdSuffix: order.id.slice(-8),
        paymentIntentIdSuffix: safeSuffix(piId, 10),
      });

      const syntheticEvent = buildSyntheticSucceededEvent(pi);
      /** @type {string | null} */
      let scheduleOrderId = null;

      await prisma.$transaction(async (tx) => {
        const fresh = await tx.webTopupOrder.findUnique({ where: { id: order.id } });
        if (!fresh || fresh.paymentStatus === PAYMENT_STATUS.PAID) {
          return;
        }

        const out = await handleWebTopupPaymentIntentSucceeded(
          tx,
          /** @type {import('stripe').Stripe.Event} */ (syntheticEvent),
          pi,
          log,
          { traceId: `zw_fb_${order.id.slice(-8)}`, source: 'stripe_fallback_poller' },
        );
        if (out?.scheduleWebTopupFulfillment) {
          scheduleOrderId = out.scheduleWebTopupFulfillment;
        }
      });

      const row = await prisma.webTopupOrder.findUnique({ where: { id: order.id } });
      const appliedFallback =
        row?.paymentStatus === PAYMENT_STATUS.PAID &&
        String(row.completedByStripeEventId ?? '').startsWith('evt_zw_fallback_');

      if (appliedFallback) {
        webTopupLog(log, 'info', 'fallback_payment_applied', {
          orderIdSuffix: order.id.slice(-8),
          paymentIntentIdSuffix: safeSuffix(piId, 10),
        });
        processed += 1;
      }

      if (scheduleOrderId) {
        scheduleWebTopupFulfillmentAfterPaid(scheduleOrderId, log, {
          traceId: `zw_fb_${scheduleOrderId.slice(-8)}`,
        });
      }
    } catch (e) {
      webTopupLog(log, 'warn', 'fallback_poller_order_error', {
        orderIdSuffix: order.id.slice(-8),
        paymentIntentIdSuffix: safeSuffix(piId, 10),
        message: String(e?.message ?? e).slice(0, 200),
      });
    }
  }

  return { ran: true, processed, candidates: candidates.length };
}
