import { Prisma } from '@prisma/client';

import { prisma } from '../../db.js';
import { env } from '../../config/env.js';
import { sendMulticastDataNotification } from './fcmAdmin.js';
import { ORDER_STATUS } from '../../constants/orderStatus.js';
import { safeSuffix } from '../../lib/webTopupObservability.js';
import {
  recordPushDelivery,
  recordFulfillmentTerminalOutcome,
} from '../../lib/opsMetrics.js';
import { emitPushDegradationAlert } from '../../lib/opsAlerts.js';
import { runWithTrace } from '../../lib/requestContext.js';

/** @typedef {'payment_success' | 'delivered' | 'failed' | 'retrying' | 'loyalty'} NotificationKind */

const COPY = {
  payment_success: {
    title: 'Payment secured',
    body: 'Your top-up is confirmed. We’re preparing delivery now.',
  },
  delivered: {
    title: 'Delivered',
    body: 'Your line should show the credit soon. Tap to view your receipt.',
  },
  failed: {
    title: 'We’re here to help',
    body: 'Your payment stayed protected. Open the app for calm next steps.',
  },
  retrying: {
    title: 'Taking another moment',
    body: 'We’re retrying delivery automatically — no need to pay again.',
  },
  loyalty: {
    title: 'Recognition updated',
    body: 'You earned family points on your last order. Tap to see your progress.',
  },
};

function orderPayload(orderId) {
  return JSON.stringify({ k: 'order', id: orderId });
}

function loyaltyPayload() {
  return JSON.stringify({ k: 'loyalty', tab: 0 });
}

function dedupeKey(orderId, kind) {
  return `order:${orderId}:${kind}`;
}

function loyaltyDedupeKey(orderId) {
  return `loyalty:${orderId}:grant`;
}

/**
 * Create inbox row (idempotent) and send FCM when new.
 *
 * @param {object} p
 * @param {string} p.userId
 * @param {string} p.dedupeKey
 * @param {string} p.category
 * @param {string} p.title
 * @param {string} p.body
 * @param {string | null} [p.payloadJson]
 * @param {'high' | 'normal'} [p.priority]
 */
export async function recordAndPushUserNotification(p) {
  const {
    userId,
    dedupeKey: key,
    category,
    title,
    body,
    payloadJson = null,
    priority = 'normal',
  } = p;

  try {
    await prisma.userNotification.create({
      data: {
        userId,
        dedupeKey: key,
        category,
        title,
        body,
        payloadJson,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { duplicate: true };
    }
    throw e;
  }

  if (!env.pushNotificationsEnabled) {
    return { recorded: true, push: 'disabled' };
  }

  const devices = await prisma.pushDevice.findMany({
    where: { userId },
    select: { fcmToken: true },
  });
  const tokens = devices.map((d) => d.fcmToken);
  if (tokens.length === 0) {
    return { recorded: true, push: 'no_tokens' };
  }

  /** @type {Record<string, string>} */
  const data = {
    zw_category: category,
    zw_dedupe: key,
  };
  if (payloadJson) {
    data.zw_payload = payloadJson;
  }

  const r = await sendMulticastDataNotification({
    tokens,
    title,
    body,
    data,
    androidPriority: priority,
  });
  return { recorded: true, push: r };
}

/**
 * Map FCM / idempotency outcome to ops counters + optional degradation alert.
 * @param {string | null} orderIdRef safe correlation for alerts (dedupe key contains order id for order pushes)
 * @param {Awaited<ReturnType<typeof recordAndPushUserNotification>>} result
 */
function observePushDelivery(orderIdRef, result) {
  const suffix =
    orderIdRef && orderIdRef.length > 0
      ? safeSuffix(orderIdRef, 10)
      : null;
  if (result?.duplicate) {
    recordPushDelivery('skipped');
    return;
  }
  if (result?.push === 'disabled') {
    recordPushDelivery('disabled');
    return;
  }
  if (result?.push === 'no_tokens') {
    recordPushDelivery('no_tokens');
    return;
  }
  if (result?.skipped) {
    recordPushDelivery('skipped');
    return;
  }
  const push = result?.push;
  if (push && typeof push === 'object' && 'error' in push && push.error) {
    recordPushDelivery('error');
    emitPushDegradationAlert({
      reason: 'fcm_multicast_threw',
      orderIdSuffix: suffix,
    });
    return;
  }
  if (
    push &&
    typeof push === 'object' &&
    'failureCount' in push &&
    typeof push.failureCount === 'number'
  ) {
    const { failureCount = 0, successCount = 0 } = push;
    if (failureCount > 0 && successCount === 0) {
      recordPushDelivery('error', failureCount);
      emitPushDegradationAlert({
        reason: 'all_tokens_failed',
        orderIdSuffix: suffix,
        failureCount,
      });
      return;
    }
    if (failureCount > 0) {
      recordPushDelivery('partial_failure', failureCount);
      return;
    }
  }
  if (push && typeof push === 'object' && push.skipped) {
    recordPushDelivery('skipped');
    return;
  }
  recordPushDelivery('ok');
}

async function loyaltyThrottleOk(userId) {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const n = await prisma.userNotification.count({
    where: {
      userId,
      category: 'loyalty',
      createdAt: { gte: since },
    },
  });
  return n < env.pushLoyaltyPerHourMax;
}

/**
 * @param {string} userId
 * @param {string} orderId
 */
export async function notifyPaymentSuccess(userId, orderId) {
  const c = COPY.payment_success;
  return recordAndPushUserNotification({
    userId,
    dedupeKey: dedupeKey(orderId, 'payment_success'),
    category: 'order',
    title: c.title,
    body: c.body,
    payloadJson: orderPayload(orderId),
    priority: 'high',
  });
}

/**
 * @param {string} userId
 * @param {string} orderId
 */
export async function notifyDelivered(userId, orderId) {
  const c = COPY.delivered;
  const out = await recordAndPushUserNotification({
    userId,
    dedupeKey: dedupeKey(orderId, 'delivered'),
    category: 'order',
    title: c.title,
    body: c.body,
    payloadJson: orderPayload(orderId),
    priority: 'high',
  });
  observePushDelivery(orderId, out);
  return out;
}

/**
 * @param {string} userId
 * @param {string} orderId
 */
export async function notifyFailed(userId, orderId) {
  const c = COPY.failed;
  const out = await recordAndPushUserNotification({
    userId,
    dedupeKey: dedupeKey(orderId, 'failed'),
    category: 'order',
    title: c.title,
    body: c.body,
    payloadJson: orderPayload(orderId),
    priority: 'high',
  });
  observePushDelivery(orderId, out);
  return out;
}

/**
 * @param {string} userId
 * @param {string} orderId
 */
export async function notifyRetrying(userId, orderId) {
  const c = COPY.retrying;
  const out = await recordAndPushUserNotification({
    userId,
    dedupeKey: dedupeKey(orderId, 'retrying'),
    category: 'order',
    title: c.title,
    body: c.body,
    payloadJson: orderPayload(orderId),
    priority: 'normal',
  });
  observePushDelivery(orderId, out);
  return out;
}

/**
 * @param {string} userId
 * @param {string} orderId
 * @param {number} points
 */
export async function notifyLoyaltyMilestone(userId, orderId, points) {
  if (points <= 0) {
    observePushDelivery(orderId, { skipped: true });
    return { skipped: true };
  }
  if (!(await loyaltyThrottleOk(userId))) {
    observePushDelivery(orderId, { skipped: true, reason: 'loyalty_throttle' });
    return { skipped: true, reason: 'loyalty_throttle' };
  }
  const c = COPY.loyalty;
  const out = await recordAndPushUserNotification({
    userId,
    dedupeKey: loyaltyDedupeKey(orderId),
    category: 'loyalty',
    title: c.title,
    body: c.body,
    payloadJson: loyaltyPayload(),
    priority: 'normal',
  });
  observePushDelivery(orderId, out);
  return out;
}

/**
 * After fulfillment worker runs — inspect order terminal state and emit pushes (dedupe prevents duplicates).
 * @param {string} orderId
 */
export async function emitFulfillmentTerminalSideEffects(orderId) {
  const order = await prisma.paymentCheckout.findUnique({
    where: { id: orderId },
    select: { userId: true, orderStatus: true },
  });
  if (!order?.userId) {
    recordFulfillmentTerminalOutcome('noop');
    return;
  }

  if (order.orderStatus === ORDER_STATUS.FULFILLED) {
    await notifyDelivered(order.userId, orderId);
    const grant = await prisma.loyaltyPointsGrant.findUnique({
      where: { paymentCheckoutId: orderId },
      select: { points: true },
    });
    if (grant) {
      await notifyLoyaltyMilestone(order.userId, orderId, grant.points);
    }
    recordFulfillmentTerminalOutcome('delivered');
    return;
  }

  if (order.orderStatus === ORDER_STATUS.FAILED) {
    await notifyFailed(order.userId, orderId);
    recordFulfillmentTerminalOutcome('failed');
    return;
  }
  recordFulfillmentTerminalOutcome('noop');
}

/**
 * Stripe paid — calm confirmation while fulfillment queues.
 * @param {string} orderId
 */
export async function emitPaymentSuccessSideEffect(orderId) {
  const order = await prisma.paymentCheckout.findUnique({
    where: { id: orderId },
    select: { userId: true, orderStatus: true },
  });
  if (!order?.userId || order.orderStatus !== ORDER_STATUS.PAID) {
    return;
  }
  await notifyPaymentSuccess(order.userId, orderId);
}

/**
 * @param {() => void | Promise<void>} fn
 * @param {string | null | undefined} [traceId]
 */
export function schedulePushSideEffect(fn, traceId) {
  setImmediate(() => {
    const exec = () => Promise.resolve(fn());
    const run =
      traceId && String(traceId).trim()
        ? () => runWithTrace(traceId, exec)
        : exec;
    Promise.resolve(run()).catch((err) => {
      console.warn('[push] side effect failed', err?.message ?? err);
    });
  });
}
