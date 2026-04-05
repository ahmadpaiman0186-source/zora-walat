import { prisma } from '../db.js';
import { env } from '../config/env.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../constants/paymentCheckoutStatus.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../constants/fulfillmentAttemptStatus.js';
import { writeOrderAudit } from './orderAuditService.js';
import { scheduleFulfillmentProcessing } from './fulfillmentProcessingService.js';
import { classifyStuckRecovery } from './processingRecoveryService.js';
import {
  detectLikelyFulfillmentSuccess,
  mergeLikelyDeliveryMetadata,
  logFulfillmentIntegrityEvent,
  summarizeDetectionLayers,
} from './fulfillmentLikelySuccessService.js';
import { safeSuffix } from '../lib/webTopupObservability.js';
import { logManualRequiredAlert } from '../lib/manualRequiredAlerts.js';
import { getTraceId } from '../lib/requestContext.js';

/** @type {Record<string, string>} */
export const MANUAL_REQUIRED_GUIDANCE = {
  fulfillment_attempt_processing_count:
    'Do not retry or fail from automation. Pull full diagnostics, reconcile attempt rows with audit logs, and escalate to engineering if the pattern repeats.',
  queued_while_processing:
    'Conflicting queued and processing attempts — risk of duplicate provider dispatch. Do not retry until an engineer confirms a single active attempt path.',
  manual_required_high_risk:
    'Conflicting or incomplete signals relative to the provider. Do not fail or blindly retry — verify the operator console and delivery record before any action.',
  orchestration_post_provider_success:
    'The provider returned success but the platform did not finish persisting delivery state. Do not mark failed — verify airtime delivery and reconcile PaymentCheckout / FulfillmentAttempt / margin before any retry.',
  failure_orchestration_low_confidence:
    'Terminal provider failure is not definitive (or the database showed fragility during completion). Verify provider and payment state externally before retry or fail.',
  generic:
    'Review provider state and Stripe payment record calmly. Use diagnostics only; prefer human confirmation before any state change.',
};

export const LIKELY_DELIVERED_GUIDANCE =
  'DO NOT FAIL — verify provider before retry. Multi-layer checks suggest airtime may already have been delivered; reconcile externally first.';

function reasonOk(reason) {
  return (
    typeof reason === 'string' &&
    reason.trim().length >= env.manualRequiredActionReasonMinLen
  );
}

function safeProviderRefSuffix(ref) {
  if (ref == null || String(ref).trim() === '') return null;
  return safeSuffix(String(ref), 10);
}

function paymentValidity(order) {
  const paid =
    order.paidAt != null &&
    order.stripePaymentIntentId != null &&
    (order.status === PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED ||
      order.status === PAYMENT_CHECKOUT_STATUS.RECHARGE_PENDING ||
      order.status === PAYMENT_CHECKOUT_STATUS.RECHARGE_COMPLETED);
  return { paid };
}

/**
 * List PaymentCheckout rows flagged manual-required (PROCESSING + metadata).
 * @param {{ limit?: number }} [opts]
 */
export async function listManualRequiredOrders(opts = {}) {
  const take = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const rows = await prisma.paymentCheckout.findMany({
    where: { orderStatus: ORDER_STATUS.PROCESSING },
    orderBy: { updatedAt: 'asc' },
    take: 500,
    select: {
      id: true,
      updatedAt: true,
      status: true,
      orderStatus: true,
      paidAt: true,
      failureReason: true,
      metadata: true,
      fulfillmentAttempts: {
        orderBy: { attemptNumber: 'desc' },
        take: 1,
        select: {
          attemptNumber: true,
          status: true,
          providerReference: true,
          failureReason: true,
          startedAt: true,
        },
      },
    },
  });

  const flagged = rows.filter(
    (r) =>
      r.metadata &&
      typeof r.metadata === 'object' &&
      !Array.isArray(r.metadata) &&
      r.metadata.processingRecovery &&
      typeof r.metadata.processingRecovery === 'object' &&
      r.metadata.processingRecovery.manualRequired === true,
  );

  const now = Date.now();
  return flagged.slice(0, take).map((r) => {
    const pr =
      r.metadata &&
      typeof r.metadata === 'object' &&
      r.metadata.processingRecovery &&
      typeof r.metadata.processingRecovery === 'object'
        ? r.metadata.processingRecovery
        : {};
    const latest = r.fulfillmentAttempts[0];
    const classification =
      typeof pr.manualRequiredClassification === 'string'
        ? pr.manualRequiredClassification
        : 'unknown';
    const manualAt =
      typeof pr.manualRequiredAt === 'string' ? pr.manualRequiredAt : null;
    const recoveryCount = Number(pr.count ?? 0);
    const likelyDelivered = pr.likelyDelivered === true;
    const recommendedNextAction = likelyDelivered
      ? LIKELY_DELIVERED_GUIDANCE
      : classification === 'manual_required_high_risk'
        ? MANUAL_REQUIRED_GUIDANCE.manual_required_high_risk
        : MANUAL_REQUIRED_GUIDANCE[classification] ?? MANUAL_REQUIRED_GUIDANCE.generic;
    return {
      orderIdSuffix: safeSuffix(r.id, 10),
      traceId:
        typeof pr.manualRequiredTraceId === 'string'
          ? pr.manualRequiredTraceId.slice(0, 36)
          : null,
      paymentStatus: r.status,
      orderStatus: r.orderStatus,
      fulfillmentStatus: latest?.status ?? null,
      latestAttemptNumber: latest?.attemptNumber ?? null,
      latestAttemptStatus: latest?.status ?? null,
      providerReferenceSuffix: safeProviderRefSuffix(latest?.providerReference),
      processingAgeMs: now - r.updatedAt.getTime(),
      recoveryCount,
      failureReason: r.failureReason,
      classification,
      likelyDelivered,
      manualRequiredAt: manualAt,
      reviewedAt:
        typeof pr.manualReviewedAt === 'string' ? pr.manualReviewedAt : null,
      recommendedNextAction,
    };
  });
}

/**
 * @param {string} orderId
 */
export async function getManualRequiredDiagnostics(orderId) {
  const order = await prisma.paymentCheckout.findUnique({
    where: { id: orderId },
    include: {
      fulfillmentAttempts: {
        orderBy: { attemptNumber: 'asc' },
      },
    },
  });

  if (!order) {
    return { ok: false, status: 404, error: 'Order not found' };
  }

  const pr =
    order.metadata &&
    typeof order.metadata === 'object' &&
    !Array.isArray(order.metadata) &&
    order.metadata.processingRecovery &&
    typeof order.metadata.processingRecovery === 'object'
      ? order.metadata.processingRecovery
      : {};

  const classification =
    typeof pr.manualRequiredClassification === 'string'
      ? pr.manualRequiredClassification
      : null;
  const manualFlag = pr.manualRequired === true;
  const likelyDeliveredFlag = pr.likelyDelivered === true;
  const attempts = order.fulfillmentAttempts.map((a) => ({
    attemptNumber: a.attemptNumber,
    status: a.status,
    providerReferenceSuffix: safeProviderRefSuffix(a.providerReference),
    failureReason: a.failureReason,
  }));

  const latest = order.fulfillmentAttempts.at(-1);
  const detection = await detectLikelyFulfillmentSuccess(
    prisma,
    order,
    order.fulfillmentAttempts,
  );
  const layerSummary = summarizeDetectionLayers(detection);
  const retryPreview = await evaluateSafeRetryEligibility(
    prisma,
    order,
    order.fulfillmentAttempts,
  );
  const failPreview = await evaluateSafeFailEligibility(
    prisma,
    order,
    order.fulfillmentAttempts,
  );

  const now = Date.now();
  const recommendedNextAction =
    detection.likely || likelyDeliveredFlag
      ? LIKELY_DELIVERED_GUIDANCE
      : detection.highRisk || classification === 'manual_required_high_risk'
        ? MANUAL_REQUIRED_GUIDANCE.manual_required_high_risk
        : (classification && MANUAL_REQUIRED_GUIDANCE[classification]) ||
          MANUAL_REQUIRED_GUIDANCE.generic;

  return {
    ok: true,
    orderIdSuffix: safeSuffix(order.id, 10),
    traceId:
      typeof pr.manualRequiredTraceId === 'string'
        ? pr.manualRequiredTraceId.slice(0, 36)
        : null,
    paymentStatus: order.status,
    orderStatus: order.orderStatus,
    paid: paymentValidity(order).paid,
    paidAt: order.paidAt,
    fulfillmentLine: latest
      ? {
          latestAttemptNumber: latest.attemptNumber,
          latestAttemptStatus: latest.status,
          providerReferenceSuffix: safeProviderRefSuffix(latest.providerReference),
        }
      : null,
    processingAgeMs: now - order.updatedAt.getTime(),
    recoveryCount: Number(pr.count ?? 0),
    failureReason: order.failureReason,
    classification,
    manualRequired: manualFlag,
    manualRequiredAt:
      typeof pr.manualRequiredAt === 'string' ? pr.manualRequiredAt : null,
    manualReviewedAt:
      typeof pr.manualReviewedAt === 'string' ? pr.manualReviewedAt : null,
    likelyDelivered: likelyDeliveredFlag || detection.likely,
    likelyFulfillmentDetection: {
      likely: detection.likely,
      highRisk: detection.highRisk,
      reason: detection.reason,
      layers: layerSummary,
    },
    attempts,
    safeRetryEligible: retryPreview.ok,
    safeRetryCode: retryPreview.code ?? null,
    safeRetryGuidance: retryPreview.guidance,
    safeFailEligible: failPreview.ok,
    safeFailCode: failPreview.code,
    safeFailGuidance: failPreview.guidance,
    recommendedNextAction,
  };
}

/**
 * Safe retry = same bar as automatic CASE A (revert to PAID + QUEUED, then schedule).
 * @param {import('@prisma/client').PrismaClient} prismaClient
 * @param {import('@prisma/client').PaymentCheckout} order
 * @param {import('@prisma/client').FulfillmentAttempt[]} attempts
 */
export async function evaluateSafeRetryEligibility(prismaClient, order, attempts) {
  if (env.prelaunchLockdown) {
    return {
      ok: false,
      code: 'prelaunch_lockdown',
      guidance:
        'Pre-launch lockdown is active — fulfillment paths are blocked. Do not retry until the platform exits lockdown.',
    };
  }
  if (order.orderStatus !== ORDER_STATUS.PROCESSING) {
    return {
      ok: false,
      code: 'not_processing',
      guidance: 'Order is not in processing — review the current status before acting.',
    };
  }
  const pr =
    order.metadata &&
    typeof order.metadata === 'object' &&
    !Array.isArray(order.metadata) &&
    order.metadata.processingRecovery &&
    typeof order.metadata.processingRecovery === 'object'
      ? order.metadata.processingRecovery
      : {};
  if (pr.manualRequired !== true) {
    return {
      ok: false,
      code: 'not_manual_required',
      guidance:
        'Safe admin retry is limited to orders flagged manual-required. Use standard recovery or support flows otherwise.',
    };
  }
  if (pr.manualRequiredClassification === 'orchestration_post_provider_success') {
    return {
      ok: false,
      code: 'orchestration_post_provider_blocked',
      guidance: MANUAL_REQUIRED_GUIDANCE.orchestration_post_provider_success,
    };
  }
  if (pr.manualRequiredClassification === 'failure_orchestration_low_confidence') {
    return {
      ok: false,
      code: 'failure_confidence_blocked',
      guidance: MANUAL_REQUIRED_GUIDANCE.failure_orchestration_low_confidence,
    };
  }
  const { paid } = paymentValidity(order);
  if (!paid) {
    return {
      ok: false,
      code: 'payment_not_valid',
      guidance:
        'Payment does not look fully captured on this checkout. Confirm Stripe and payment status before any retry.',
    };
  }

  const processing = attempts.filter(
    (a) => a.status === FULFILLMENT_ATTEMPT_STATUS.PROCESSING,
  );
  const queued = attempts.filter(
    (a) => a.status === FULFILLMENT_ATTEMPT_STATUS.QUEUED,
  );
  if (processing.length !== 1 || queued.length > 0) {
    return {
      ok: false,
      code: 'conflicting_attempts',
      guidance:
        MANUAL_REQUIRED_GUIDANCE.fulfillment_attempt_processing_count,
    };
  }
  const proc = processing[0];
  const det = await detectLikelyFulfillmentSuccess(prismaClient, order, attempts);
  if (det.likely || pr.likelyDelivered === true) {
    return {
      ok: false,
      code: 'likely_fulfillment_success',
      guidance: LIKELY_DELIVERED_GUIDANCE,
      detection: det,
    };
  }
  if (det.highRisk) {
    return {
      ok: false,
      code: 'manual_required_high_risk',
      guidance: MANUAL_REQUIRED_GUIDANCE.manual_required_high_risk,
      detection: det,
    };
  }
  if (classifyStuckRecovery(proc) !== 'revert_paid') {
    return {
      ok: false,
      code: 'not_revert_safe',
      guidance:
        'This attempt does not meet strict revert-and-retry criteria. Escalate for manual reconciliation.',
    };
  }
  return {
    ok: true,
    code: 'eligible',
    guidance:
      'Payment is recorded. You may run a controlled safe retry: we will revert this attempt to queued and re-run fulfillment once. Confirm with provider logs if unsure.',
  };
}

/**
 * @param {import('@prisma/client').PrismaClient} prismaClient
 * @param {import('@prisma/client').PaymentCheckout} order
 * @param {import('@prisma/client').FulfillmentAttempt[]} attempts
 */
export async function evaluateSafeFailEligibility(prismaClient, order, attempts) {
  if (order.orderStatus !== ORDER_STATUS.PROCESSING) {
    return {
      ok: false,
      code: 'not_processing',
      guidance: 'Order is not in processing — failing may be inappropriate.',
    };
  }
  const pr =
    order.metadata &&
    typeof order.metadata === 'object' &&
    !Array.isArray(order.metadata) &&
    order.metadata.processingRecovery &&
    typeof order.metadata.processingRecovery === 'object'
      ? order.metadata.processingRecovery
      : {};
  if (pr.manualRequired !== true) {
    return {
      ok: false,
      code: 'not_manual_required',
      guidance: 'Admin fail is only offered for manual-required processing orders.',
    };
  }
  if (pr.manualRequiredClassification === 'orchestration_post_provider_success') {
    return {
      ok: false,
      code: 'orchestration_post_provider_blocked',
      guidance: MANUAL_REQUIRED_GUIDANCE.orchestration_post_provider_success,
    };
  }
  if (pr.manualRequiredClassification === 'failure_orchestration_low_confidence') {
    return {
      ok: false,
      code: 'failure_confidence_blocked',
      guidance: MANUAL_REQUIRED_GUIDANCE.failure_orchestration_low_confidence,
    };
  }
  const processing = attempts.filter(
    (a) => a.status === FULFILLMENT_ATTEMPT_STATUS.PROCESSING,
  );
  if (processing.length !== 1) {
    return {
      ok: false,
      code: 'attempt_shape',
      guidance: 'Resolve attempt ambiguity before failing the checkout.',
    };
  }

  if (pr.likelyDelivered === true) {
    return {
      ok: false,
      code: 'likely_delivered_flag',
      guidance: LIKELY_DELIVERED_GUIDANCE,
    };
  }

  const det = await detectLikelyFulfillmentSuccess(prismaClient, order, attempts);
  if (det.likely) {
    return {
      ok: false,
      code: 'likely_fulfillment_success',
      guidance: LIKELY_DELIVERED_GUIDANCE,
      detection: det,
    };
  }
  if (det.highRisk) {
    return {
      ok: false,
      code: 'manual_required_high_risk',
      guidance: MANUAL_REQUIRED_GUIDANCE.manual_required_high_risk,
      detection: det,
    };
  }

  return {
    ok: true,
    code: 'eligible',
    guidance:
      'Failing will mark the checkout failed after confirming with payment/ops policy. Customer impact applies; use only when delivery cannot be completed.',
  };
}

function clearManualRequiredOnResolve(metadata) {
  const base =
    metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? { ...metadata }
      : {};
  const prev =
    base.processingRecovery &&
    typeof base.processingRecovery === 'object' &&
    !Array.isArray(base.processingRecovery)
      ? { ...base.processingRecovery }
      : {};
  prev.manualRequired = false;
  prev.manualRequiredClearedAt = new Date().toISOString();
  base.processingRecovery = prev;
  return base;
}

/**
 * @param {{ orderId: string, reason: string, actorUserId: string, ip: string | null }} p
 */
export async function markManualRequiredReviewed(p) {
  if (!reasonOk(p.reason)) {
    return { ok: false, status: 400, error: 'reason_too_short' };
  }
  const order = await prisma.paymentCheckout.findUnique({
    where: { id: p.orderId },
    select: { id: true, metadata: true, orderStatus: true },
  });
  if (!order) return { ok: false, status: 404, error: 'Order not found' };
  const prCheck =
    order.metadata &&
    typeof order.metadata === 'object' &&
    !Array.isArray(order.metadata) &&
    order.metadata.processingRecovery &&
    typeof order.metadata.processingRecovery === 'object'
      ? order.metadata.processingRecovery
      : {};
  if (prCheck.manualRequired !== true) {
    return { ok: false, status: 409, error: 'not_manual_required' };
  }
  const meta = order.metadata;
  const base =
    meta && typeof meta === 'object' && !Array.isArray(meta) ? { ...meta } : {};
  const prev =
    base.processingRecovery &&
    typeof base.processingRecovery === 'object' &&
    !Array.isArray(base.processingRecovery)
      ? { ...base.processingRecovery }
      : {};
  prev.manualReviewedAt = new Date().toISOString();
  prev.manualReviewedReason = String(p.reason).trim().slice(0, 500);
  prev.manualReviewedByUserIdSuffix = safeSuffix(p.actorUserId, 8);
  base.processingRecovery = prev;

  await prisma.paymentCheckout.update({
    where: { id: p.orderId },
    data: { metadata: base },
  });
  await writeOrderAudit(prisma, {
    event: 'manual_required_mark_reviewed',
    payload: {
      orderId: p.orderId,
      actorUserIdSuffix: safeSuffix(p.actorUserId, 8),
    },
    ip: p.ip,
  });
  return {
    ok: true,
    orderIdSuffix: safeSuffix(p.orderId, 10),
    message:
      'Review recorded. This does not change delivery state — only operational acknowledgment.',
  };
}

/**
 * @param {{ orderId: string, reason: string, actorUserId: string, ip: string | null }} p
 */
export async function adminSafeRetryProcessingOrder(p) {
  if (!reasonOk(p.reason)) {
    return { ok: false, status: 400, error: 'reason_too_short' };
  }
  const order = await prisma.paymentCheckout.findUnique({
    where: { id: p.orderId },
    include: {
      fulfillmentAttempts: { orderBy: { attemptNumber: 'asc' } },
    },
  });
  if (!order) return { ok: false, status: 404, error: 'Order not found' };

  const elig = await evaluateSafeRetryEligibility(
    prisma,
    order,
    order.fulfillmentAttempts,
  );
  if (!elig.ok) {
    return {
      ok: false,
      status: 409,
      error: elig.code ?? 'not_eligible',
      guidance: elig.guidance,
    };
  }

  const proc = order.fulfillmentAttempts.find(
    (a) => a.status === FULFILLMENT_ATTEMPT_STATUS.PROCESSING,
  );
  if (!proc) {
    return { ok: false, status: 409, error: 'no_processing_attempt' };
  }

  const traceId = getTraceId();

  await prisma.$transaction(async (tx) => {
    const meta = clearManualRequiredOnResolve(order.metadata);
    const pr =
      meta.processingRecovery &&
      typeof meta.processingRecovery === 'object'
        ? { ...meta.processingRecovery }
        : {};
    pr.adminSafeRetryAt = new Date().toISOString();
    pr.adminSafeRetryReason = String(p.reason).trim().slice(0, 500);
    pr.adminSafeRetryBySuffix = safeSuffix(p.actorUserId, 8);
    meta.processingRecovery = pr;

    const a = await tx.fulfillmentAttempt.updateMany({
      where: {
        id: proc.id,
        status: FULFILLMENT_ATTEMPT_STATUS.PROCESSING,
      },
      data: {
        status: FULFILLMENT_ATTEMPT_STATUS.QUEUED,
        startedAt: null,
      },
    });
    const o = await tx.paymentCheckout.updateMany({
      where: {
        id: p.orderId,
        orderStatus: ORDER_STATUS.PROCESSING,
      },
      data: {
        orderStatus: ORDER_STATUS.PAID,
        status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
        metadata: meta,
      },
    });
    if (a.count === 0 || o.count === 0) {
      throw Object.assign(new Error('concurrent_state_change'), {
        code: 'conflict',
      });
    }
    await writeOrderAudit(tx, {
      event: 'manual_required_safe_retry',
      payload: {
        orderId: p.orderId,
        attemptIdSuffix: safeSuffix(proc.id, 8),
        actorUserIdSuffix: safeSuffix(p.actorUserId, 8),
      },
      ip: p.ip,
    });
  });

  scheduleFulfillmentProcessing(p.orderId, traceId);
  return {
    ok: true,
    orderIdSuffix: safeSuffix(p.orderId, 10),
    message:
      'Safe retry applied: order returned to paid with a queued attempt; fulfillment was scheduled.',
  };
}

/**
 * @param {{ orderId: string, reason: string, actorUserId: string, ip: string | null }} p
 */
export async function adminSafeFailProcessingOrder(p) {
  if (!reasonOk(p.reason)) {
    return { ok: false, status: 400, error: 'reason_too_short' };
  }
  const order = await prisma.paymentCheckout.findUnique({
    where: { id: p.orderId },
    include: {
      fulfillmentAttempts: { orderBy: { attemptNumber: 'asc' } },
    },
  });
  if (!order) return { ok: false, status: 404, error: 'Order not found' };

  const elig = await evaluateSafeFailEligibility(
    prisma,
    order,
    order.fulfillmentAttempts,
  );
  if (!elig.ok) {
    const shouldPersistBlock =
      elig.code === 'likely_fulfillment_success' ||
      elig.code === 'manual_required_high_risk' ||
      elig.code === 'likely_delivered_flag' ||
      Boolean(elig.detection?.likely || elig.detection?.highRisk);
    if (shouldPersistBlock) {
      const det = elig.detection ?? (await detectLikelyFulfillmentSuccess(
        prisma,
        order,
        order.fulfillmentAttempts,
      ));
      const prMeta =
        order.metadata &&
        typeof order.metadata === 'object' &&
        !Array.isArray(order.metadata) &&
        order.metadata.processingRecovery &&
        typeof order.metadata.processingRecovery === 'object'
          ? order.metadata.processingRecovery
          : {};
      const hadLikely = prMeta.likelyDelivered === true;
      const newMeta = mergeLikelyDeliveryMetadata(order.metadata, {
        likelyDelivered: det.likely || elig.code === 'likely_delivered_flag',
        manualRequired: true,
        manualRequiredClassification: 'manual_required_high_risk',
      });
      await prisma.paymentCheckout.updateMany({
        where: {
          id: p.orderId,
          orderStatus: ORDER_STATUS.PROCESSING,
        },
        data: { metadata: newMeta },
      });
      if (det.likely && !hadLikely) {
        logFulfillmentIntegrityEvent('fulfillment_likely_success_detected', {
          orderId: p.orderId,
          traceId: getTraceId(),
          severity: 'WARN',
          extra: {
            reason: det.reason,
            ...summarizeDetectionLayers(det),
          },
        });
      }
      logFulfillmentIntegrityEvent('order_failure_blocked_due_to_likely_delivery', {
        orderId: p.orderId,
        traceId: getTraceId(),
        severity: 'WARN',
        extra: { reason: det.reason, code: elig.code },
      });
      if (det.layers?.financial?.any === true) {
        logFulfillmentIntegrityEvent('failure_blocked_due_to_financial_evidence', {
          orderId: p.orderId,
          traceId: getTraceId(),
          severity: 'WARN',
          extra: { code: elig.code },
        });
      }
    }
    return {
      ok: false,
      status: 409,
      error: elig.code ?? 'not_eligible',
      guidance: elig.guidance,
    };
  }

  const proc = order.fulfillmentAttempts.find(
    (a) => a.status === FULFILLMENT_ATTEMPT_STATUS.PROCESSING,
  );
  if (!proc) {
    return { ok: false, status: 409, error: 'no_processing_attempt' };
  }

  const adminReason = `admin_manual_fail:${String(p.reason).trim().slice(0, 400)}`;

  await prisma.$transaction(async (tx) => {
    const meta = clearManualRequiredOnResolve(order.metadata);
    const pr =
      meta.processingRecovery &&
      typeof meta.processingRecovery === 'object'
        ? { ...meta.processingRecovery }
        : {};
    pr.adminSafeFailAt = new Date().toISOString();
    pr.adminSafeFailReason = String(p.reason).trim().slice(0, 500);
    pr.adminSafeFailBySuffix = safeSuffix(p.actorUserId, 8);
    meta.processingRecovery = pr;

    await tx.fulfillmentAttempt.updateMany({
      where: {
        id: proc.id,
        status: FULFILLMENT_ATTEMPT_STATUS.PROCESSING,
      },
      data: {
        status: FULFILLMENT_ATTEMPT_STATUS.FAILED,
        failedAt: new Date(),
        failureReason: 'admin_manual_fail',
      },
    });
    await tx.paymentCheckout.updateMany({
      where: {
        id: p.orderId,
        orderStatus: ORDER_STATUS.PROCESSING,
      },
      data: {
        orderStatus: ORDER_STATUS.FAILED,
        status: PAYMENT_CHECKOUT_STATUS.PAYMENT_FAILED,
        failedAt: new Date(),
        failureReason: adminReason,
        metadata: meta,
      },
    });
    await writeOrderAudit(tx, {
      event: 'manual_required_safe_fail',
      payload: {
        orderId: p.orderId,
        attemptIdSuffix: safeSuffix(proc.id, 8),
        actorUserIdSuffix: safeSuffix(p.actorUserId, 8),
      },
      ip: p.ip,
    });
  });

  return {
    ok: true,
    orderIdSuffix: safeSuffix(p.orderId, 10),
    message:
      'Order marked failed with audit trail. Confirm refunds or support steps per policy.',
  };
}

/**
 * Post–recovery tick: count + aged alerts (structured only).
 * @param {string | null | undefined} traceId
 */
export async function runManualRequiredAlertScan(traceId) {
  const rows = await listManualRequiredOrders({ limit: 500 });
  const n = rows.length;
  if (n >= env.manualRequiredAlertCountThreshold) {
    logManualRequiredAlert({
      event: 'manual_required_count_threshold_exceeded',
      severity: n >= env.manualRequiredAlertCountThreshold * 2 ? 'CRITICAL' : 'WARN',
      traceId,
      orderId: null,
      extra: { openCount: n, threshold: env.manualRequiredAlertCountThreshold },
    });
  }

  const agedCut = Date.now() - env.manualRequiredAgedMs;
  for (const r of rows) {
    const t = r.manualRequiredAt ? Date.parse(r.manualRequiredAt) : NaN;
    if (Number.isFinite(t) && t < agedCut) {
      logManualRequiredAlert({
        event: 'manual_required_aged',
        severity: 'WARN',
        traceId,
        orderId: null,
        extra: {
          orderIdSuffix: r.orderIdSuffix,
          manualRequiredAgeMs: Date.now() - t,
          classification: r.classification,
        },
      });
    }
  }
}
