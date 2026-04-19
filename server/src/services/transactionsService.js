import { prisma } from '../db.js';
import { env } from '../config/env.js';
import { parseManualReviewFlags } from './canonicalPhase1Lifecycle.js';
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

function parseJsonObject(str) {
  if (str == null || typeof str !== 'string' || !str.trim()) return null;
  try {
    const o = JSON.parse(str);
    return o && typeof o === 'object' && !Array.isArray(o) ? o : null;
  } catch {
    return null;
  }
}

function orderMetadataIndicatesVerifying(metadata) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return false;
  }
  const pr = metadata.processingRecovery;
  if (!pr || typeof pr !== 'object') return false;
  if (pr.manualRequired === true) return true;
  return false;
}

function normalizedOutcomeFromLatestAttempt(latestAttempt) {
  if (!latestAttempt?.responseSummary) return null;
  const o = parseJsonObject(latestAttempt.responseSummary);
  if (!o) return null;
  const n =
    o.normalizedOutcome != null ? String(o.normalizedOutcome).toLowerCase() : '';
  return n || null;
}

/**
 * Distinguishes terminal provider/business failure vs exhausted retryable path (backend/public).
 * @param {{ orderStatus?: string | null, failureReason?: string | null }} order
 * @param {{ responseSummary?: string | null, failureReason?: string | null } | null | undefined} latestAttempt
 * @returns {'failed' | 'failed_terminally'}
 */
export function deriveCustomerFailedTerminalKey(order, latestAttempt) {
  const os = String(order?.orderStatus ?? '').toUpperCase();
  if (os !== ORDER_STATUS.FAILED) {
    return 'failed';
  }
  const n = normalizedOutcomeFromLatestAttempt(latestAttempt);
  if (n === 'failed_retryable') {
    return 'failed';
  }
  if (
    n === 'failed_terminal' ||
    n === 'invalid_request' ||
    n === 'unsupported_route'
  ) {
    return 'failed_terminally';
  }
  const fr = String(latestAttempt?.failureReason ?? order?.failureReason ?? '').toLowerCase();
  if (fr.includes('retryable') || fr.includes('_retry')) {
    return 'failed';
  }
  if (n) {
    return 'failed_terminally';
  }
  return 'failed';
}

function attemptResponseSuggestsVerifying(attempt) {
  if (!attempt?.responseSummary) return false;
  const o = parseJsonObject(attempt.responseSummary);
  if (!o) return false;
  const n =
    o.normalizedOutcome != null ? String(o.normalizedOutcome).toLowerCase() : '';
  if (
    n === 'pending_verification' ||
    n === 'ambiguous' ||
    n === 'failure_unconfirmed'
  ) {
    return true;
  }
  const p = o.proofClassification != null ? String(o.proofClassification) : '';
  if (
    p === 'pending_provider' ||
    p === 'ambiguous_evidence' ||
    p === 'insufficient_negative_proof'
  ) {
    return true;
  }
  return false;
}

/**
 * Customer-safe stage for Flutter timeline/chips (not raw enums).
 * `verifying` = payment safe but provider/manual follow-up — not claimed delivered.
 * @param {{ orderStatus?: string | null, metadata?: unknown }} order
 * @param {{ status?: string | null, responseSummary?: string | null } | null | undefined} latestAttempt
 */
export function deriveCustomerTrackingStageForOrder(order, latestAttempt) {
  const os = String(order?.orderStatus ?? '').toUpperCase();
  const fs = String(latestAttempt?.status ?? '').toUpperCase();

  const terminal =
    os === ORDER_STATUS.FULFILLED ||
    os === 'DELIVERED' ||
    os === ORDER_STATUS.FAILED ||
    os === ORDER_STATUS.CANCELLED;

  if (!terminal) {
    const manual = parseManualReviewFlags(order?.metadata);
    if (manual.manualReviewRequired) {
      return 'requires_review';
    }
    const paidAt = order?.paidAt;
    const timeoutMs = env.processingTimeoutMs ?? 600_000;
    const isAutoRetry =
      os === ORDER_STATUS.PROCESSING && fs === FULFILLMENT_ATTEMPT_STATUS.FAILED;
    if (
      paidAt instanceof Date &&
      Date.now() - paidAt.getTime() > timeoutMs &&
      (os === ORDER_STATUS.PAID || os === ORDER_STATUS.PROCESSING) &&
      !isAutoRetry
    ) {
      return 'delayed';
    }
  }

  if (
    !terminal &&
    (orderMetadataIndicatesVerifying(order?.metadata) ||
      attemptResponseSuggestsVerifying(latestAttempt))
  ) {
    return 'verifying';
  }

  if (os === ORDER_STATUS.CANCELLED) return 'cancelled';
  if (os === ORDER_STATUS.FAILED) {
    return deriveCustomerFailedTerminalKey(order, latestAttempt) === 'failed_terminally'
      ? 'failed_terminally'
      : 'failed';
  }
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

/**
 * @param {{ fulfillmentTruthSnapshot?: unknown }} order
 * @returns {number | null}
 */
function deliveredValueUsdFromTruth(order) {
  const truth = order.fulfillmentTruthSnapshot;
  if (!truth || typeof truth !== 'object' || Array.isArray(truth)) return null;
  const d = /** @type {Record<string, unknown>} */ (truth);
  const v = d.deliveredAmountUsd ?? d.deliveredUsd ?? d.amountUsd;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return null;
}

/**
 * Customer-facing trust bucket (no raw enums in UI copy).
 * @param {{ orderStatus?: string | null, paidAt?: Date | null, metadata?: unknown }} order
 * @param {string} trackingStageKey
 */
function deriveCustomerTrustStatus(order, trackingStageKey) {
  if (trackingStageKey === 'delivered') {
    return {
      trustStatusKey: 'delivered',
      trustStatusDetail:
        'Delivered — the carrier should credit this line shortly if not already visible.',
    };
  }
  if (trackingStageKey === 'failed_terminally') {
    return {
      trustStatusKey: 'failed_terminally',
      trustStatusDetail:
        'Delivery could not be completed; automatic retries will not change this outcome. If payment was captured, support will align with policy.',
    };
  }
  if (trackingStageKey === 'failed') {
    return {
      trustStatusKey: 'failed',
      trustStatusDetail:
        'This order did not complete. Any capture is handled per your payment method.',
    };
  }
  if (trackingStageKey === 'cancelled') {
    return {
      trustStatusKey: 'cancelled',
      trustStatusDetail: 'This order was cancelled before delivery.',
    };
  }

  if (trackingStageKey === 'requires_review') {
    return {
      trustStatusKey: 'requires_review',
      trustStatusDetail:
        'This order needs a quick manual check before delivery can finish. No action is required from you right now.',
    };
  }

  if (trackingStageKey === 'retrying') {
    return {
      trustStatusKey: 'retrying',
      trustStatusDetail:
        'Delivery hit a temporary issue; we are retrying automatically. You do not need to pay again.',
    };
  }

  if (trackingStageKey === 'verifying') {
    return {
      trustStatusKey: 'processing',
      trustStatusDetail:
        'Confirming delivery with the carrier. You will see an update here when it is final.',
    };
  }

  if (trackingStageKey === 'delayed') {
    return {
      trustStatusKey: 'delayed',
      trustStatusDetail:
        'Still processing — carriers occasionally take longer. We are not done yet.',
    };
  }

  const paidAt = order.paidAt;
  const timeoutMs = env.processingTimeoutMs ?? 600_000;
  if (
    paidAt instanceof Date &&
    Date.now() - paidAt.getTime() > timeoutMs &&
    (order.orderStatus === ORDER_STATUS.PAID ||
      order.orderStatus === ORDER_STATUS.PROCESSING)
  ) {
    return {
      trustStatusKey: 'delayed',
      trustStatusDetail:
        'Still processing — carriers occasionally take longer. We are not done yet.',
    };
  }

  return {
    trustStatusKey: 'processing',
    trustStatusDetail:
      'Processing your top-up with the carrier. Most complete within a few minutes.',
  };
}

/**
 * Stable lifecycle key aligned with Sprint 4 public contract (`completed` = success terminal).
 * @param {string} trackingStageKey
 * @param {{ orderStatus?: string | null, failureReason?: string | null }} order
 * @param {{ responseSummary?: string | null, failureReason?: string | null } | null | undefined} latestAttempt
 */
export function derivePublicLifecycleStage(trackingStageKey, order, latestAttempt) {
  if (trackingStageKey === 'delivered') {
    return 'completed';
  }
  if (trackingStageKey === 'failed' || trackingStageKey === 'failed_terminally') {
    return deriveCustomerFailedTerminalKey(order, latestAttempt) === 'failed_terminally'
      ? 'failed_terminally'
      : 'failed';
  }
  return trackingStageKey;
}

/**
 * @param {{ stripeFeeActualUsdCents?: number | null, stripeFeeEstimateUsdCents?: number | null }} order
 * @returns {{ feeUsd: number, feeIsFinal: boolean } | null}
 */
function stripeFeeDisplay(order) {
  if (order.stripeFeeActualUsdCents != null) {
    const c = Math.max(0, Math.floor(Number(order.stripeFeeActualUsdCents)));
    return { feeUsd: c / 100, feeIsFinal: true };
  }
  if (order.stripeFeeEstimateUsdCents != null) {
    const c = Math.max(0, Math.floor(Number(order.stripeFeeEstimateUsdCents)));
    return { feeUsd: c / 100, feeIsFinal: false };
  }
  return null;
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

  const trackingStageKey = deriveCustomerTrackingStageForOrder(order, latestAttempt);
  const lifecycleStageKey = derivePublicLifecycleStage(
    trackingStageKey,
    order,
    latestAttempt,
  );
  const fulfillmentStatusLabelResolved =
    trackingStageKey === 'verifying'
      ? 'Confirming delivery'
      : trackingStageKey === 'requires_review'
        ? 'Needs review'
        : trackingStageKey === 'delayed'
          ? 'Taking longer than usual'
          : trackingStageKey === 'retrying'
            ? 'Retrying delivery'
            : trackingStageKey === 'failed_terminally'
              ? 'Failed — no automatic recovery'
              : fulfillmentStatusLabel(fulfillmentStatus);

  const trust = deriveCustomerTrustStatus(order, trackingStageKey);
  const paidUsd =
    order.amountUsdCents != null && Number.isFinite(Number(order.amountUsdCents))
      ? Math.max(0, Number(order.amountUsdCents)) / 100
      : null;
  const deliveredValueUsd = deliveredValueUsdFromTruth(order);
  const feeDisp = stripeFeeDisplay(order);

  return {
    orderId: order.id,
    orderReference: order.id,
    orderStatus: order.orderStatus,
    orderStatusLabel: orderStatusLabel(order.orderStatus),
    paymentStatus: order.status,
    paymentStatusLabel: paymentStatusLabel(order.status),
    fulfillmentStatus,
    fulfillmentStatusLabel: fulfillmentStatusLabelResolved,
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
    lifecycleStageKey,
    providerReferenceSuffix: providerRefSuffix(latestAttempt?.providerReference),
    recipientMasked: maskNationalDigits(order.recipientNational),
    /** Server is source of truth for account-linked orders. */
    dataSource: 'account',
    updatedAtIso: order.updatedAt.toISOString(),

    trustStatusKey: trust.trustStatusKey,
    trustStatusDetail: trust.trustStatusDetail,
    paidUsd,
    deliveredValueUsd,
    processingFeeUsd: feeDisp ? feeDisp.feeUsd : null,
    processingFeeIsFinal: feeDisp ? feeDisp.feeIsFinal : null,
    transparencyFxNote:
      'Charge is in USD. Your bank or wallet may show a converted amount or an international fee.',
    transparencyDeliveryNote:
      'Mobile airtime is usually applied within a few minutes; rare carrier delays can take longer.',
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
      metadata: true,
      fulfillmentTruthSnapshot: true,
      stripeFeeEstimateUsdCents: true,
      stripeFeeActualUsdCents: true,
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
          responseSummary: true,
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
      metadata: true,
      fulfillmentTruthSnapshot: true,
      stripeFeeEstimateUsdCents: true,
      stripeFeeActualUsdCents: true,
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
          responseSummary: true,
        },
      },
    },
  });

  if (!row) return { ok: false, status: 404, error: 'Not found' };

  const latestAttempt = row.fulfillmentAttempts?.[0] ?? null;
  return { ok: true, order: mapUserOrder({ order: row, latestAttempt }) };
}

