import { prisma } from '../db.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../constants/paymentCheckoutStatus.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../constants/fulfillmentAttemptStatus.js';
import { isLikelyPaymentCheckoutId } from '../lib/paymentCheckoutId.js';

function labelFromStatus(status, map) {
  if (!status) return null;
  return map[status] ?? status;
}

function paymentStatusLabel(status) {
  const map = {
    [PAYMENT_CHECKOUT_STATUS.INITIATED]: 'In progress',
    [PAYMENT_CHECKOUT_STATUS.CHECKOUT_CREATED]: 'Payment created',
    [PAYMENT_CHECKOUT_STATUS.PAYMENT_PENDING]: 'Payment pending',
    [PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED]: 'Payment succeeded',
    [PAYMENT_CHECKOUT_STATUS.PAYMENT_FAILED]: 'Payment failed',
    [PAYMENT_CHECKOUT_STATUS.RECHARGE_PENDING]: 'Recharge pending',
    [PAYMENT_CHECKOUT_STATUS.RECHARGE_COMPLETED]: 'Recharge completed',
    [PAYMENT_CHECKOUT_STATUS.RECHARGE_FAILED]: 'Recharge failed',
  };
  return labelFromStatus(status, map);
}

function fulfillmentStatusLabel(status) {
  const map = {
    [FULFILLMENT_ATTEMPT_STATUS.QUEUED]: 'Queued',
    [FULFILLMENT_ATTEMPT_STATUS.PROCESSING]: 'Processing',
    [FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED]: 'Fulfilled',
    [FULFILLMENT_ATTEMPT_STATUS.FAILED]: 'Failed',
  };
  return labelFromStatus(status, map);
}

function orderStatusLabel(status) {
  const map = {
    [ORDER_STATUS.PENDING]: 'Pending',
    [ORDER_STATUS.PAID]: 'Paid',
    [ORDER_STATUS.PROCESSING]: 'Processing',
    [ORDER_STATUS.FULFILLED]: 'Fulfilled',
    [ORDER_STATUS.FAILED]: 'Failed',
    [ORDER_STATUS.CANCELLED]: 'Cancelled',
  };
  return labelFromStatus(status, map);
}

/** Customer-safe stage for Flutter timeline/chips (not raw enums). */
function deriveCustomerTrackingStage(orderStatus, fulfillmentStatus) {
  const os = String(orderStatus ?? '').toUpperCase();
  const fs = String(fulfillmentStatus ?? '').toUpperCase();
  if (os === ORDER_STATUS.CANCELLED) return 'cancelled';
  if (os === ORDER_STATUS.FAILED) return 'failed';
  if (os === ORDER_STATUS.FULFILLED || os === 'DELIVERED') return 'delivered';
  if (os === ORDER_STATUS.PENDING) return 'payment_pending';
  if (os === ORDER_STATUS.PAID) {
    if (fs === FULFILLMENT_ATTEMPT_STATUS.PROCESSING) return 'sending';
    if (fs === FULFILLMENT_ATTEMPT_STATUS.QUEUED) return 'preparing';
    return 'preparing';
  }
  if (os === ORDER_STATUS.PROCESSING) {
    if (fs === FULFILLMENT_ATTEMPT_STATUS.PROCESSING) return 'sending';
    if (fs === FULFILLMENT_ATTEMPT_STATUS.QUEUED) return 'preparing';
    if (fs === FULFILLMENT_ATTEMPT_STATUS.FAILED) return 'retrying';
    return 'preparing';
  }
  return 'preparing';
}

function maskNationalDigits(raw) {
  const d = String(raw ?? '').replace(/\D/g, '');
  if (d.length < 4) return null;
  const tail = d.slice(-4);
  const stars = '•'.repeat(Math.min(6, Math.max(0, d.length - 4)));
  return `${stars}${tail}`;
}

function providerRefSuffix(ref) {
  const s = String(ref ?? '').trim();
  if (!s) return null;
  if (s.length <= 12) return s;
  return `…${s.slice(-10)}`;
}

function friendlyFailureReason(orderFailureReason, attemptFailureReason) {
  const raw = String(orderFailureReason ?? attemptFailureReason ?? '').toLowerCase();
  if (!raw) return null;

  if (raw.includes('cancel')) return 'This order was cancelled.';
  if (raw.includes('timeout') || raw.includes('network')) {
    return 'Temporary provider issue. Please try again shortly.';
  }

  if (
    raw.includes('not_configured') ||
    raw.includes('reloadly_not_configured') ||
    raw.includes('operator_unmapped') ||
    raw.includes('invalid_amount') ||
    raw.includes('order_incomplete') ||
    raw.includes('config')
  ) {
    return 'Service is currently unavailable for this request. Please try again later.';
  }

  if (raw.includes('stripe')) return 'Payment could not be processed.';
  if (raw.includes('fraud')) return 'This payment was blocked for safety checks.';

  return 'Your payment could not be completed.';
}

function mapUserOrder({ order, latestAttempt }) {
  const fulfillmentStatus = latestAttempt?.status ?? null;
  const fulfilledAt =
    fulfillmentStatus === FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED
      ? latestAttempt?.completedAt ?? null
      : null;
  const fulfillmentFailedAt =
    fulfillmentStatus === FULFILLMENT_ATTEMPT_STATUS.FAILED
      ? latestAttempt?.failedAt ?? null
      : null;

  const trackingStageKey = deriveCustomerTrackingStage(
    order.orderStatus,
    fulfillmentStatus,
  );

  return {
    orderId: order.id,
    orderReference: order.id,
    orderStatus: order.orderStatus,
    orderStatusLabel: orderStatusLabel(order.orderStatus),
    paymentStatus: order.status,
    paymentStatusLabel: paymentStatusLabel(order.status),
    fulfillmentStatus,
    fulfillmentStatusLabel: fulfillmentStatusLabel(fulfillmentStatus),
    amountUsdCents: order.amountUsdCents,
    currency: order.currency,
    operatorKey: order.operatorKey,
    packageId: order.packageId,
    provider: order.provider,

    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    paidAt: order.paidAt ?? null,
    failedAt: order.failedAt ?? null,
    cancelledAt: order.cancelledAt ?? null,

    fulfilledAt,
    fulfillmentFailedAt,

    failureReason: friendlyFailureReason(order.failureReason, latestAttempt?.failureReason),

    trackingStageKey,
    providerReferenceSuffix: providerRefSuffix(latestAttempt?.providerReference),
    recipientMasked: maskNationalDigits(order.recipientNational),
    /** Server is source of truth for account-linked orders. */
    dataSource: 'account',
    updatedAtIso: order.updatedAt.toISOString(),
  };
}

export async function listUserOrders({
  userId,
  limit = 20,
  orderStatus,
  paymentStatus,
  fulfillmentStatus,
} = {}) {
  const lim = Number(limit);
  const take = Number.isFinite(lim) ? Math.min(50, Math.max(1, lim)) : 20;

  const where = { userId };
  if (orderStatus) where.orderStatus = orderStatus;
  if (paymentStatus) where.status = paymentStatus;

  // Fulfillment filtering requires joining; apply after fetch conservatively.
  const rows = await prisma.paymentCheckout.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true,
      orderStatus: true,
      status: true,
      provider: true,
      amountUsdCents: true,
      currency: true,
      operatorKey: true,
      packageId: true,
      recipientNational: true,
      failureReason: true,
      createdAt: true,
      updatedAt: true,
      paidAt: true,
      failedAt: true,
      cancelledAt: true,
      fulfillmentAttempts: {
        orderBy: { attemptNumber: 'desc' },
        take: 1,
        select: {
          status: true,
          failureReason: true,
          completedAt: true,
          failedAt: true,
          attemptNumber: true,
          providerReference: true,
        },
      },
    },
  });

  const mapped = rows
    .map((r) => ({
      order: r,
      latestAttempt: r.fulfillmentAttempts?.[0] ?? null,
    }))
    .filter((x) => {
      if (!fulfillmentStatus) return true;
      return x.latestAttempt?.status === fulfillmentStatus;
    })
    .map((x) => mapUserOrder(x));

  return { ok: true, orders: mapped };
}

export async function inspectUserOrder({ userId, id } = {}) {
  if (!isLikelyPaymentCheckoutId(id)) {
    return { ok: false, status: 400, error: 'Invalid order id' };
  }

  const row = await prisma.paymentCheckout.findFirst({
    where: { id, userId },
    select: {
      id: true,
      orderStatus: true,
      status: true,
      provider: true,
      amountUsdCents: true,
      currency: true,
      operatorKey: true,
      packageId: true,
      recipientNational: true,
      failureReason: true,
      createdAt: true,
      updatedAt: true,
      paidAt: true,
      failedAt: true,
      cancelledAt: true,
      fulfillmentAttempts: {
        orderBy: { attemptNumber: 'desc' },
        take: 1,
        select: {
          status: true,
          failureReason: true,
          completedAt: true,
          failedAt: true,
          attemptNumber: true,
          providerReference: true,
        },
      },
    },
  });

  if (!row) return { ok: false, status: 404, error: 'Not found' };

  const latestAttempt = row.fulfillmentAttempts?.[0] ?? null;
  return { ok: true, order: mapUserOrder({ order: row, latestAttempt }) };
}

