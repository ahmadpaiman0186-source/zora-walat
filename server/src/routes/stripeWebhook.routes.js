import { Router } from 'express';

import { env } from '../config/env.js';
import { getStripeClient } from '../services/stripe.js';
import { prisma, Prisma } from '../db.js';
import { PAYMENT_CHECKOUT_STATUS } from '../constants/paymentCheckoutStatus.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { isLikelyPaymentCheckoutId } from '../lib/paymentCheckoutId.js';
import { assertTransition } from '../domain/orders/orderLifecycle.js';
import { writeOrderAudit } from '../services/orderAuditService.js';
import {
  ensureQueuedFulfillmentAttempt,
  scheduleFulfillmentProcessing,
} from '../services/fulfillmentProcessingService.js';
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
} from '../lib/opsMetrics.js';
import {
  evaluateRollingAlerts,
  emitProviderDegradationAlert,
} from '../lib/opsAlerts.js';
import { logOpsEvent } from '../lib/opsLog.js';

const router = Router();

const PAYMENT_PRE_SUCCESS = [
  PAYMENT_CHECKOUT_STATUS.INITIATED,
  PAYMENT_CHECKOUT_STATUS.PAYMENT_PENDING,
  PAYMENT_CHECKOUT_STATUS.CHECKOUT_CREATED,
];

/** Generic responses — no Stripe or stack details to clients. */
const ERR_INVALID = { error: 'Invalid request' };
const ERR_UNAVAILABLE = { error: 'Service unavailable' };

function stripePaymentIntentId(session) {
  const pi = session.payment_intent;
  if (typeof pi === 'string') return pi;
  if (pi && typeof pi === 'object' && pi.id != null) return String(pi.id);
  return null;
}

function stripeCustomerId(session) {
  const c = session.customer;
  if (typeof c === 'string') return c;
  if (c && typeof c === 'object' && c.id != null) return String(c.id);
  return null;
}

/**
 * Stripe webhook — raw body required for `constructEvent`.
 * Production: `STRIPE_WEBHOOK_SECRET` is required at process startup (see `src/index.js`).
 */
router.post('/', async (req, res) => {
  const stripe = getStripeClient();
  const secret = env.stripeWebhookSecret;
  if (!stripe || !secret) {
    req.log?.warn(
      { securityEvent: 'webhook_not_configured' },
      'security',
    );
    return res.status(503).json(ERR_UNAVAILABLE);
  }

  const sig = req.headers['stripe-signature'];
  if (!sig || typeof sig !== 'string') {
    return res.status(400).json(ERR_INVALID);
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch {
    req.log?.warn(
      { securityEvent: 'stripe_webhook_signature_invalid' },
      'security',
    );
    return res.status(400).json(ERR_INVALID);
  }

  req.log?.info({ eventType: event.type }, 'stripe webhook');

  const stripeEventIdSuffix = safeSuffix(event.id, 8);

  let orderIdToScheduleFulfillment = null;
  /** Set when `checkout.session.completed` fails validation vs Stripe totals (possible misconfig or tamper). */
  let checkoutAmountMismatchOrderId = null;

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
        const raw = session.metadata?.internalCheckoutId;
        if (!raw) {
          return;
        }
        if (!isLikelyPaymentCheckoutId(raw)) {
          req.log?.warn(
            { securityEvent: 'webhook_invalid_metadata_shape' },
            'security',
          );
          return;
        }
        const row = await tx.paymentCheckout.findUnique({
          where: { id: raw },
        });
        if (!row) {
          req.log?.warn('stripe webhook: unknown checkout row');
          return;
        }
        if (row.userId == null) {
          req.log?.warn(
            { securityEvent: 'webhook_checkout_missing_user' },
            'security',
          );
          return;
        }

        const total = session.amount_total;
        const sessionCurrency = String(session.currency ?? 'usd').toLowerCase();
        const rowCurrency = String(row.currency ?? 'usd').toLowerCase();
        if (total == null) {
          req.log?.warn('stripe webhook: missing amount_total');
          return;
        }

        if (total !== row.amountUsdCents || sessionCurrency !== rowCurrency) {
          req.log?.error(
            {
              expectedCents: row.amountUsdCents,
              stripeTotal: total,
              expectedCurrency: rowCurrency,
              stripeCurrency: sessionCurrency,
            },
            'stripe webhook: amount or currency mismatch',
          );
          if (row.orderStatus === ORDER_STATUS.PENDING) {
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
          return;
        }

        if (row.orderStatus !== ORDER_STATUS.PENDING) {
          return;
        }

        assertTransition(row.orderStatus, ORDER_STATUS.PAID);

        const piId = stripePaymentIntentId(session);
        const custId = stripeCustomerId(session);

        const updated = await tx.paymentCheckout.updateMany({
          where: {
            id: raw,
            orderStatus: ORDER_STATUS.PENDING,
            status: { in: PAYMENT_PRE_SUCCESS },
          },
          data: {
            orderStatus: ORDER_STATUS.PAID,
            status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
            stripePaymentIntentId: piId,
            stripeCustomerId: custId,
            completedByWebhookEventId: event.id,
            paidAt: new Date(),
          },
        });

        if (updated.count === 0) {
          return;
        }

        await writeOrderAudit(tx, {
          event: 'order_status_changed',
          payload: { orderId: raw, to: ORDER_STATUS.PAID },
          ip: null,
        });

        await ensureQueuedFulfillmentAttempt(tx, raw);
        await writeOrderAudit(tx, {
          event: 'payment_completed',
          payload: { orderId: raw },
          ip: null,
        });
        // Async airtime: Reloadly/mock via `processFulfillmentForOrder` (same as POST /api/recharge/execute).
        orderIdToScheduleFulfillment = raw;
        return;
      }

      if (event.type === 'payment_intent.succeeded') {
        const pi = event.data.object;
        await handleWebTopupPaymentIntentSucceeded(tx, event, pi, req.log);
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
      }
    });

    webTopupLog(req.log, 'info', 'webhook_processed', {
      stripeEventType: event.type,
      stripeEventIdSuffix,
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      recordRetry('webhook_event_duplicate');
      webTopupLog(req.log, 'info', 'webhook_duplicate_ignored', {
        stripeEventType: event.type,
        stripeEventIdSuffix,
        prismaCode: 'P2002',
      });
      return res.json({ received: true });
    }
    bumpCounter('stripe_webhook_transaction_failed');
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

  if (orderIdToScheduleFulfillment) {
    recordPaymentCheckoutOutcome(true);
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
