import { prisma } from '../db.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../constants/paymentCheckoutStatus.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../constants/fulfillmentAttemptStatus.js';
import { isLikelyPaymentCheckoutId } from '../lib/paymentCheckoutId.js';

function asQueryString(value) {
  if (value == null) return null;
  if (Array.isArray(value)) return String(value[0]);
  return String(value);
}

function parseOptionalInt(value) {
  const s = asQueryString(value);
  if (s == null) return null;
  const n = parseInt(s, 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function validateEnum(value, allowedValues) {
  const s = asQueryString(value);
  if (s == null) return { ok: true, value: null };
  const norm = s.trim();
  if (!allowedValues.has(norm)) {
    return {
      ok: false,
      error: `Invalid value "${norm}". Allowed: ${Array.from(allowedValues).join(', ')}`,
    };
  }
  return { ok: true, value: norm };
}

const ORDER_STATUS_VALUES = new Set(Object.values(ORDER_STATUS));
const PAYMENT_STATUS_VALUES = new Set(Object.values(PAYMENT_CHECKOUT_STATUS));
const FULFILLMENT_STATUS_VALUES = new Set(Object.values(FULFILLMENT_ATTEMPT_STATUS));

function mapOrderRow(row) {
  return {
    id: row.id,
    orderStatus: row.orderStatus,
    paymentStatus: row.status,
    provider: row.provider,
    amountUsdCents: row.amountUsdCents,
    currency: row.currency,
    operatorKey: row.operatorKey,
    packageId: row.packageId,
    recipientNational: row.recipientNational,
    stripeCheckoutSessionId: row.stripeCheckoutSessionId,
    stripePaymentIntentId: row.stripePaymentIntentId,
    completedByWebhookEventId: row.completedByWebhookEventId,
    paidAt: row.paidAt,
    failedAt: row.failedAt,
    cancelledAt: row.cancelledAt,
    failureReason: row.failureReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapAttemptRow(att) {
  return {
    id: att.id,
    attemptNumber: att.attemptNumber,
    status: att.status,
    provider: att.provider,
    providerReference: att.providerReference,
    failureReason: att.failureReason,
    requestSummary: att.requestSummary,
    responseSummary: att.responseSummary,
    startedAt: att.startedAt,
    completedAt: att.completedAt,
    failedAt: att.failedAt,
    createdAt: att.createdAt,
    updatedAt: att.updatedAt,
  };
}

export async function listAdminOrders({
  limit = 20,
  orderStatus,
  paymentStatus,
  fulfillmentStatus,
  attemptNumber,
} = {}) {
  const lim = Number(limit);
  const take = Number.isFinite(lim) ? Math.min(100, Math.max(1, lim)) : 20;

  const orderStatusV = validateEnum(orderStatus, ORDER_STATUS_VALUES);
  if (!orderStatusV.ok) return { ok: false, status: 400, error: orderStatusV.error };
  const paymentStatusV = validateEnum(paymentStatus, PAYMENT_STATUS_VALUES);
  if (!paymentStatusV.ok)
    return { ok: false, status: 400, error: paymentStatusV.error };
  const fulfillmentStatusV = validateEnum(fulfillmentStatus, FULFILLMENT_STATUS_VALUES);
  if (!fulfillmentStatusV.ok)
    return { ok: false, status: 400, error: fulfillmentStatusV.error };

  const statusWhere = {};
  if (orderStatusV.value) statusWhere.orderStatus = orderStatusV.value;
  if (paymentStatusV.value) statusWhere.status = paymentStatusV.value;

  const fulfillmentSome = {};
  if (fulfillmentStatusV.value) fulfillmentSome.status = fulfillmentStatusV.value;
  if (attemptNumber != null) fulfillmentSome.attemptNumber = attemptNumber;

  if (Object.keys(fulfillmentSome).length > 0) {
    statusWhere.fulfillmentAttempts = { some: fulfillmentSome };
  }

  const displayAttemptNumber = attemptNumber ?? 1;

  const rows = await prisma.paymentCheckout.findMany({
    where: statusWhere,
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
      stripeCheckoutSessionId: true,
      stripePaymentIntentId: true,
      completedByWebhookEventId: true,
      paidAt: true,
      failedAt: true,
      cancelledAt: true,
      failureReason: true,
      createdAt: true,
      updatedAt: true,
      fulfillmentAttempts: {
        where: { attemptNumber: displayAttemptNumber },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          attemptNumber: true,
          status: true,
          provider: true,
          providerReference: true,
          failureReason: true,
          requestSummary: true,
          responseSummary: true,
          startedAt: true,
          completedAt: true,
          failedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  return {
    ok: true,
    orders: rows.map((r) => ({
      ...mapOrderRow(r),
      fulfillmentAttempt: r.fulfillmentAttempts?.[0]
        ? mapAttemptRow(r.fulfillmentAttempts[0])
        : null,
    })),
  };
}

export async function inspectAdminOrder({ id, includeAuditLogs = false }) {
  if (!isLikelyPaymentCheckoutId(id)) {
    return { ok: false, status: 400, error: 'Invalid order id' };
  }

  const order = await prisma.paymentCheckout.findUnique({
    where: { id },
    select: {
      id: true,
      idempotencyKey: true,
      requestFingerprint: true,
      stripeCheckoutSessionId: true,
      stripePaymentIntentId: true,
      status: true,
      orderStatus: true,
      provider: true,
      amountUsdCents: true,
      currency: true,
      operatorKey: true,
      recipientNational: true,
      packageId: true,
      paidAt: true,
      failedAt: true,
      cancelledAt: true,
      failureReason: true,
      completedByWebhookEventId: true,
      createdAt: true,
      updatedAt: true,
      fulfillmentAttempts: {
        orderBy: { attemptNumber: 'asc' },
        select: {
          id: true,
          attemptNumber: true,
          status: true,
          provider: true,
          providerReference: true,
          failureReason: true,
          requestSummary: true,
          responseSummary: true,
          startedAt: true,
          completedAt: true,
          failedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!order) return { ok: false, status: 404, error: 'Not found' };

  let auditLogs = [];
  if (includeAuditLogs) {
    auditLogs = await prisma.auditLog.findMany({
      where: {
        payload: { contains: `"orderId":"${id}"` },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { id: true, event: true, payload: true, createdAt: true, ip: true },
    });
  }

  return {
    ok: true,
    order: mapOrderRow(order),
    fulfillmentAttempts: order.fulfillmentAttempts.map(mapAttemptRow),
    auditLogs,
  };
}

function classifyRetryEligibility(failureReason) {
  const fr = String(failureReason ?? '').trim().toLowerCase();
  if (!fr) {
    return {
      retryAllowed: false,
      retryCategory: 'unknown',
      reason: 'No failureReason recorded for latest attempt; conservative refusal.',
      riskLevel: 'high',
    };
  }

  const isTimeout = fr.includes('timeout');
  const isNetwork = fr.includes('network');

  // Refuse config/auth/mapping/validation-like failures even if they contain other words.
  const isConfigLike =
    fr.includes('config') ||
    fr.includes('not_configured') ||
    fr.includes('unauthorized') ||
    fr.includes('forbidden') ||
    fr.includes('reloadly_auth_') ||
    fr.includes('reloadly_not_configured') ||
    fr.includes('operator_unmapped') ||
    fr.includes('reloadly_operator_unmapped') ||
    fr.includes('reloadly_operator_id_invalid');

  const isValidationLike =
    fr.includes('reloadly_order_incomplete') ||
    fr.includes('reloadly_invalid_amount') ||
    fr.includes('invalid_amount') ||
    fr.includes('order_incomplete') ||
    fr.includes('bad_request') ||
    fr.includes('rejected');

  const isTransient = isTimeout || isNetwork;
  const retryAllowed = isTransient && !isConfigLike && !isValidationLike;

  if (!retryAllowed) {
    const retryCategory = isConfigLike
      ? 'config'
      : isValidationLike
        ? 'validation'
        : 'terminal';
    return {
      retryAllowed: false,
      retryCategory,
      reason: `Retry not allowed for failureReason "${failureReason}". Only network/timeout failures are eligible.`,
      riskLevel: retryCategory === 'terminal' ? 'medium' : 'high',
    };
  }

  return {
    retryAllowed: true,
    retryCategory: 'transient',
    reason: isTimeout
      ? 'Failure appears timeout-related; safe to consider a retry after confirming the provider is healthy.'
      : 'Failure appears network-related; safe to consider a retry after confirming connectivity.',
    riskLevel: isTimeout ? 'low' : 'medium',
  };
}

export async function retryPreviewAdminOrder({ id }) {
  if (!isLikelyPaymentCheckoutId(id)) {
    return { ok: false, status: 400, error: 'Invalid order id' };
  }

  const order = await prisma.paymentCheckout.findUnique({
    where: { id },
    select: {
      id: true,
      orderStatus: true,
      status: true,
      paidAt: true,
      failedAt: true,
      cancelledAt: true,
      updatedAt: true,
      createdAt: true,
    },
  });

  if (!order) return { ok: false, status: 404, error: 'Not found' };

  // Never retry if the order has already succeeded (even if last attempt failed).
  const succeededAttempt = await prisma.fulfillmentAttempt.findFirst({
    where: { orderId: id, status: FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED },
    select: { id: true },
  });
  if (
    order.orderStatus === ORDER_STATUS.FULFILLED ||
    succeededAttempt ||
    order.orderStatus === ORDER_STATUS.CANCELLED
  ) {
    const lastAttempt = await prisma.fulfillmentAttempt.findFirst({
      where: { orderId: id },
      orderBy: { attemptNumber: 'desc' },
      select: {
        id: true,
        attemptNumber: true,
        status: true,
        provider: true,
        providerReference: true,
        failureReason: true,
        failedAt: true,
        completedAt: true,
        updatedAt: true,
      },
    });
    return {
      ok: true,
      retryPreview: {
        orderId: id,
        orderStatus: order.orderStatus,
        paymentStatus: order.status,
        latestAttempt: {
          status: lastAttempt?.status ?? null,
          failureReason: lastAttempt?.failureReason ?? null,
          attemptNumber: lastAttempt?.attemptNumber ?? null,
        },
        retryAllowed: false,
        reason:
          order.orderStatus === ORDER_STATUS.CANCELLED
            ? 'Order is CANCELLED; retries are forbidden.'
            : 'Fulfillment already succeeded; retries are forbidden.',
        riskLevel: 'high',
        retryCategory: 'terminal',
        recommendedAction:
          'Investigate payment + fulfillment logs; do not attempt automatic or manual retries for this order.',
      },
    };
  }

  const lastAttempt = await prisma.fulfillmentAttempt.findFirst({
    where: { orderId: id },
    orderBy: { attemptNumber: 'desc' },
    select: {
      id: true,
      attemptNumber: true,
      status: true,
      provider: true,
      providerReference: true,
      failureReason: true,
      failedAt: true,
      completedAt: true,
      updatedAt: true,
    },
  });

  if (!lastAttempt) {
    return {
      ok: true,
      retryPreview: {
        orderId: id,
        orderStatus: order.orderStatus,
        paymentStatus: order.status,
        latestAttempt: { status: null, failureReason: null, attemptNumber: null },
        retryAllowed: false,
        reason: 'No fulfillment attempt exists yet; retry decision cannot be safely previewed.',
        riskLevel: 'high',
        retryCategory: 'unknown',
        recommendedAction:
          'Ensure orchestration created attempt #1 via the webhook; then re-check retry eligibility once a FAILED attempt exists.',
      },
    };
  }

  if (lastAttempt.status !== FULFILLMENT_ATTEMPT_STATUS.FAILED) {
    return {
      ok: true,
      retryPreview: {
        orderId: id,
        orderStatus: order.orderStatus,
        paymentStatus: order.status,
        latestAttempt: {
          status: lastAttempt.status,
          failureReason: lastAttempt.failureReason ?? null,
          attemptNumber: lastAttempt.attemptNumber,
        },
        retryAllowed: false,
        reason: `Last attempt is "${lastAttempt.status}" (not FAILED); retry is not safe until it is terminal FAILED.`,
        riskLevel: 'medium',
        retryCategory: 'terminal',
        recommendedAction:
          'Wait for the current fulfillment attempt to reach a terminal FAILED state before considering a manual retry.',
      },
    };
  }

  const eligibility = classifyRetryEligibility(lastAttempt.failureReason);
  const recommendedAction = eligibility.retryAllowed
    ? 'If provider health is confirmed and operator mapping is correct, an admin may execute a controlled retry (execution endpoint not implemented here).'
    : 'Investigate the failure; do not retry. If needed, fix configuration/mapping and re-create a new payment checkout.';

  return {
    ok: true,
    retryPreview: {
      orderId: id,
      orderStatus: order.orderStatus,
      paymentStatus: order.status,
      latestAttempt: {
        status: lastAttempt.status,
        failureReason: lastAttempt.failureReason ?? null,
        attemptNumber: lastAttempt.attemptNumber,
      },
      retryAllowed: eligibility.retryAllowed,
      reason: eligibility.reason,
      riskLevel: eligibility.riskLevel,
      retryCategory: eligibility.retryCategory,
      recommendedAction,
    },
  };
}

