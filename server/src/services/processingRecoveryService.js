import { randomUUID } from 'node:crypto';

import { prisma } from '../db.js';
import { env } from '../config/env.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../constants/paymentCheckoutStatus.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../constants/fulfillmentAttemptStatus.js';
import { writeOrderAudit } from './orderAuditService.js';
import { scheduleFulfillmentProcessing } from './fulfillmentProcessingService.js';
import { resolveAirtimeProviderName } from '../domain/fulfillment/executeAirtimeFulfillment.js';
import { getTraceId, runWithTrace } from '../lib/requestContext.js';
import { safeSuffix } from '../lib/webTopupObservability.js';
import { logManualRequiredAlert } from '../lib/manualRequiredAlerts.js';
import { mergeManualRequiredMetadata } from '../lib/manualRequiredMetadata.js';
import {
  detectLikelyFulfillmentSuccess,
  mergeLikelyDeliveryMetadata,
  logFulfillmentIntegrityEvent,
  summarizeDetectionLayers,
} from './fulfillmentLikelySuccessService.js';

/** @param {string} event */
function logRecovery(event, payload) {
  const traceId = payload.traceId ?? getTraceId() ?? null;
  const { orderId, ...rest } = payload;
  console.log(
    JSON.stringify({
      recoveryLog: true,
      event,
      traceId,
      orderIdSuffix: orderId ? safeSuffix(orderId, 10) : null,
      ...rest,
    }),
  );
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

/**
 * CASE A: safe to treat as pre-provider completion (revert to PAID + same attempt QUEUED).
 * CASE B: evidence of outbound / response — close attempt, enqueue next (requires provider idempotency where available).
 */
export function classifyStuckRecovery(processingAttempt) {
  const resObjEarly = parseJsonObject(processingAttempt.responseSummary);
  const normEarly =
    resObjEarly?.normalizedOutcome != null
      ? String(resObjEarly.normalizedOutcome).toLowerCase()
      : '';
  const proofEarly =
    resObjEarly?.proofClassification != null
      ? String(resObjEarly.proofClassification)
      : '';
  if (
    normEarly === 'pending_verification' ||
    normEarly === 'ambiguous' ||
    normEarly === 'failure_unconfirmed' ||
    proofEarly === 'pending_provider' ||
    proofEarly === 'ambiguous_evidence' ||
    proofEarly === 'insufficient_negative_proof'
  ) {
    return 'manual_review';
  }

  const ref = processingAttempt.providerReference;
  const hasRef = ref != null && String(ref).trim() !== '';

  const resObj = parseJsonObject(processingAttempt.responseSummary);
  const hasResponse =
    (resObj && Object.keys(resObj).length > 0) ||
    (typeof processingAttempt.responseSummary === 'string' &&
      processingAttempt.responseSummary.length > 4 &&
      processingAttempt.responseSummary.trim() !== '{}');

  const reqStr = String(processingAttempt.requestSummary ?? '');
  const reqObj = parseJsonObject(processingAttempt.requestSummary);
  const looksQueuedOnly =
    reqObj &&
    Object.keys(reqObj).length === 1 &&
    reqObj.phase === 'queued';
  const hasRichRequest =
    reqStr.length > 40 ||
    (reqObj &&
      Object.keys(reqObj).length > 1 &&
      !(reqObj.phase === 'queued' || reqObj.phase === 'processing')) ||
    (reqObj &&
      reqObj.phase === 'processing' &&
      Object.keys(reqObj).length > 1);

  if (hasRef || hasResponse || hasRichRequest) {
    return 'retry_new_attempt';
  }
  if (looksQueuedOnly || reqStr === '' || reqStr === '{}') {
    return 'revert_paid';
  }
  return 'revert_paid';
}

function mergeRecoveryMetadata(metadata, inc) {
  const base =
    metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? { ...metadata }
      : {};
  const prev =
    base.processingRecovery &&
    typeof base.processingRecovery === 'object' &&
    !Array.isArray(base.processingRecovery)
      ? { ...base.processingRecovery }
      : { count: 0 };
  prev.count = Number(prev.count || 0) + inc;
  prev.lastAt = new Date().toISOString();
  base.processingRecovery = prev;
  return base;
}

/**
 * @param {{ limit?: number, traceId?: string | null }} [opts]
 * @returns {Promise<Array<{ id: string, updatedAt: Date, ageMs: number }>>}
 */
export async function detectStuckOrders(opts = {}) {
  const traceId = opts.traceId ?? getTraceId() ?? null;
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const cutoff = new Date(Date.now() - env.processingTimeoutMs);

  const rows = await prisma.paymentCheckout.findMany({
    where: {
      orderStatus: ORDER_STATUS.PROCESSING,
      updatedAt: { lt: cutoff },
    },
    select: { id: true, updatedAt: true },
    orderBy: { updatedAt: 'asc' },
    take: limit,
  });

  const now = Date.now();
  for (const r of rows) {
    logRecovery('order_stuck_detected', {
      orderId: r.id,
      traceId,
      processingAgeMs: now - r.updatedAt.getTime(),
    });
  }

  return rows.map((r) => ({
    id: r.id,
    updatedAt: r.updatedAt,
    ageMs: now - r.updatedAt.getTime(),
  }));
}

/**
 * @param {{ limit?: number, traceId?: string | null }} [opts]
 */
export async function recoverStuckOrders(opts = {}) {
  const traceId = opts.traceId ?? getTraceId() ?? null;
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const cutoff = new Date(Date.now() - env.processingTimeoutMs);

  const stuckIds = await prisma.paymentCheckout.findMany({
    where: {
      orderStatus: ORDER_STATUS.PROCESSING,
      updatedAt: { lt: cutoff },
    },
    select: { id: true },
    orderBy: { updatedAt: 'asc' },
    take: limit,
  });

  let recovered = 0;
  let retries = 0;
  let failed = 0;
  let manual = 0;

  for (const { id: orderId } of stuckIds) {
    const res = await recoverOneStuckOrder(orderId, traceId);
    if (res === 'recovered') recovered += 1;
    else if (res === 'retry') retries += 1;
    else if (res === 'failed') failed += 1;
    else if (res === 'manual') manual += 1;
  }

  return { recovered, retries, failed, manual, scanned: stuckIds.length };
}

/**
 * @param {string} orderId
 * @param {string | null} traceId
 * @returns {Promise<'noop' | 'recovered' | 'retry' | 'failed' | 'manual'>}
 */
async function recoverOneStuckOrder(orderId, traceId) {
  const txResult = await prisma.$transaction(async (tx) => {
    const order = await tx.paymentCheckout.findFirst({
      where: {
        id: orderId,
        orderStatus: ORDER_STATUS.PROCESSING,
        updatedAt: {
          lt: new Date(Date.now() - env.processingTimeoutMs),
        },
      },
    });

    if (!order) {
      return { kind: 'noop' };
    }

    const attempts = await tx.fulfillmentAttempt.findMany({
      where: { orderId },
      orderBy: { attemptNumber: 'asc' },
    });

    const processing = attempts.filter(
      (a) => a.status === FULFILLMENT_ATTEMPT_STATUS.PROCESSING,
    );

    if (processing.length !== 1) {
      const metaEarly = order.metadata;
      const recEarly =
        metaEarly &&
        typeof metaEarly === 'object' &&
        !Array.isArray(metaEarly) &&
        metaEarly.processingRecovery &&
        typeof metaEarly.processingRecovery === 'object'
          ? metaEarly.processingRecovery
          : {};
      const wasManual = Boolean(recEarly.manualRequired);
      const classKey = 'fulfillment_attempt_processing_count';
      const newMeta = mergeManualRequiredMetadata(order.metadata, {
        reason: 'unexpected_processing_attempts',
        traceId,
        classification: classKey,
      });
      await tx.paymentCheckout.updateMany({
        where: { id: orderId, orderStatus: ORDER_STATUS.PROCESSING },
        data: { metadata: newMeta },
      });
      logRecovery('order_recovery_manual_required', {
        orderId,
        traceId,
        reason: 'fulfillment_attempt_processing_count',
        processingCount: processing.length,
      });
      await writeOrderAudit(tx, {
        event: 'processing_recovery_manual_required',
        payload: {
          orderId,
          reason: 'unexpected_processing_attempts',
          processingCount: processing.length,
        },
        ip: null,
      });
      return {
        kind: 'manual',
        firstManualFlag: !wasManual,
        manualReason: classKey,
        processingCount: processing.length,
      };
    }

    const proc = processing[0];
    const meta = order.metadata;
    const rec =
      meta &&
      typeof meta === 'object' &&
      !Array.isArray(meta) &&
      meta.processingRecovery &&
      typeof meta.processingRecovery === 'object'
        ? meta.processingRecovery
        : { count: 0 };
    const prevCount = Number(rec.count ?? 0);

    if (prevCount >= env.processingRecoveryMaxAttempts) {
      const det = await detectLikelyFulfillmentSuccess(tx, order, attempts);
      if (det.likely || det.highRisk) {
        const hadLikely = Boolean(rec.likelyDelivered);
        const newMeta = mergeLikelyDeliveryMetadata(order.metadata, {
          likelyDelivered: det.likely,
          manualRequired: true,
          manualRequiredClassification: 'manual_required_high_risk',
        });
        await tx.paymentCheckout.updateMany({
          where: { id: orderId, orderStatus: ORDER_STATUS.PROCESSING },
          data: { metadata: newMeta },
        });
        if (det.likely && !hadLikely) {
          logFulfillmentIntegrityEvent('fulfillment_likely_success_detected', {
            orderId,
            traceId,
            severity: 'WARN',
            extra: { reason: det.reason, ...summarizeDetectionLayers(det) },
          });
        }
        logFulfillmentIntegrityEvent('manual_required_high_risk', {
          orderId,
          traceId,
          severity: 'WARN',
          extra: { reason: det.reason, blockedAutoFail: true },
        });
        logFulfillmentIntegrityEvent('order_failure_blocked_due_to_likely_delivery', {
          orderId,
          traceId,
          severity: 'WARN',
          extra: { reason: det.reason, source: 'processing_recovery_cap' },
        });
        if (det.layers?.financial?.any === true) {
          logFulfillmentIntegrityEvent('failure_blocked_due_to_financial_evidence', {
            orderId,
            traceId,
            severity: 'WARN',
            extra: { source: 'processing_recovery_cap' },
          });
        }
        await writeOrderAudit(tx, {
          event: 'processing_recovery_fail_blocked_likely_delivery',
          payload: {
            orderId,
            likely: det.likely,
            highRisk: det.highRisk,
            reason: det.reason,
          },
          ip: null,
        });
        const wasManual = Boolean(rec.manualRequired);
        return {
          kind: 'manual',
          firstManualFlag: !wasManual,
          manualReason: 'manual_required_high_risk',
        };
      }

      const attFailed = await tx.fulfillmentAttempt.updateMany({
        where: {
          id: proc.id,
          status: FULFILLMENT_ATTEMPT_STATUS.PROCESSING,
        },
        data: {
          status: FULFILLMENT_ATTEMPT_STATUS.FAILED,
          failedAt: new Date(),
          failureReason: 'processing_recovery_limit_exceeded',
        },
      });
      const ordFailed = await tx.paymentCheckout.updateMany({
        where: {
          id: orderId,
          orderStatus: ORDER_STATUS.PROCESSING,
        },
        data: {
          orderStatus: ORDER_STATUS.FAILED,
          status: PAYMENT_CHECKOUT_STATUS.PAYMENT_FAILED,
          failedAt: new Date(),
          failureReason: 'processing_recovery_limit_exceeded',
        },
      });

      if (ordFailed.count === 0) {
        return { kind: 'noop' };
      }

      await writeOrderAudit(tx, {
        event: 'processing_recovery_failed',
        payload: {
          orderId,
          attempts: prevCount,
          fulfillmentAttemptTouched: attFailed.count,
        },
        ip: null,
      });

      logRecovery('order_recovery_failed', {
        orderId,
        traceId,
        reason: 'max_recovery_attempts',
        recoveryCount: prevCount,
      });

      return { kind: 'failed' };
    }

    let path = classifyStuckRecovery(proc);
    if (path !== 'revert_paid' && path !== 'retry_new_attempt' && path !== 'manual_review') {
      path = 'revert_paid';
    }

    if (path === 'manual_review') {
      const wasManualMr = Boolean(rec.manualRequired);
      const newMetaMr = mergeManualRequiredMetadata(order.metadata, {
        reason: 'provider_truth_uncertain_stuck',
        traceId,
        classification: 'reloadly_no_auto_recovery',
      });
      await tx.paymentCheckout.updateMany({
        where: { id: orderId, orderStatus: ORDER_STATUS.PROCESSING },
        data: { metadata: newMetaMr },
      });
      await writeOrderAudit(tx, {
        event: 'processing_recovery_manual_required',
        payload: {
          orderId,
          reason: 'provider_truth_uncertain_stuck',
          fulfillmentAttemptIdSuffix: safeSuffix(proc.id, 8),
        },
        ip: null,
      });
      logRecovery('order_recovery_manual_required', {
        orderId,
        traceId,
        reason: 'provider_truth_uncertain_stuck',
      });
      return {
        kind: 'manual',
        firstManualFlag: !wasManualMr,
        manualReason: 'provider_truth_uncertain_stuck',
      };
    }

    const ambiguous =
      attempts.filter((a) => a.status === FULFILLMENT_ATTEMPT_STATUS.QUEUED)
        .length > 0;
    if (ambiguous) {
      const wasManualQ = Boolean(rec.manualRequired);
      const classKeyQ = 'queued_while_processing';
      const newMetaQ = mergeManualRequiredMetadata(order.metadata, {
        reason: 'queued_while_processing',
        traceId,
        classification: classKeyQ,
      });
      await tx.paymentCheckout.updateMany({
        where: { id: orderId, orderStatus: ORDER_STATUS.PROCESSING },
        data: { metadata: newMetaQ },
      });
      logRecovery('order_recovery_manual_required', {
        orderId,
        traceId,
        reason: 'queued_attempt_exists_while_processing',
      });
      await writeOrderAudit(tx, {
        event: 'processing_recovery_manual_required',
        payload: {
          orderId,
          reason: 'queued_while_processing',
        },
        ip: null,
      });
      return {
        kind: 'manual',
        firstManualFlag: !wasManualQ,
        manualReason: classKeyQ,
      };
    }

    const nextMeta = mergeRecoveryMetadata(meta, 1);

    if (path === 'revert_paid') {
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
          id: orderId,
          orderStatus: ORDER_STATUS.PROCESSING,
        },
        data: {
          orderStatus: ORDER_STATUS.PAID,
          status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
          metadata: nextMeta,
        },
      });
      if (o.count === 0 || a.count === 0) {
        return { kind: 'noop' };
      }
      await writeOrderAudit(tx, {
        event: 'processing_recovery_reverted_paid',
        payload: {
          orderId,
          fulfillmentAttemptIdSuffix: safeSuffix(proc.id, 8),
          recoveryCount: prevCount + 1,
        },
        ip: null,
      });
      logRecovery('order_recovered', {
        orderId,
        traceId,
        path: 'revert_paid',
        recoveryCount: prevCount + 1,
      });
      return { kind: 'recovered', path: 'revert_paid' };
    }

    const maxN = attempts.reduce((m, a) => Math.max(m, a.attemptNumber), 0);
    const nextNum = maxN + 1;

    const sup = await tx.fulfillmentAttempt.updateMany({
      where: {
        id: proc.id,
        status: FULFILLMENT_ATTEMPT_STATUS.PROCESSING,
      },
      data: {
        status: FULFILLMENT_ATTEMPT_STATUS.FAILED,
        failedAt: new Date(),
        failureReason: 'processing_recovery_superseded',
      },
    });
    if (sup.count === 0) {
      return { kind: 'noop' };
    }

    await tx.fulfillmentAttempt.create({
      data: {
        orderId,
        attemptNumber: nextNum,
        status: FULFILLMENT_ATTEMPT_STATUS.QUEUED,
        provider: resolveAirtimeProviderName(),
        requestSummary: JSON.stringify({
          phase: 'queued',
          via: 'processing_recovery',
        }),
      },
    });

    const o = await tx.paymentCheckout.updateMany({
      where: {
        id: orderId,
        orderStatus: ORDER_STATUS.PROCESSING,
      },
      data: {
        orderStatus: ORDER_STATUS.PAID,
        status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
        metadata: nextMeta,
      },
    });
    if (o.count === 0) {
      return { kind: 'noop' };
    }

    await writeOrderAudit(tx, {
      event: 'processing_recovery_retry_attempt',
      payload: {
        orderId,
        priorAttemptNumber: proc.attemptNumber,
        nextAttemptNumber: nextNum,
        recoveryCount: prevCount + 1,
      },
      ip: null,
    });

    logRecovery('order_recovery_retry', {
      orderId,
      traceId,
      nextAttemptNumber: nextNum,
      priorAttemptNumber: proc.attemptNumber,
      recoveryCount: prevCount + 1,
    });
    return { kind: 'retry', path: 'new_attempt' };
  });

  const kind = txResult.kind;
  if (kind === 'manual' && txResult.firstManualFlag) {
    logManualRequiredAlert({
      event: 'manual_required_detected',
      severity: 'WARN',
      traceId,
      orderId,
      extra: {
        classification: txResult.manualReason ?? 'unknown',
        processingCount: txResult.processingCount,
      },
    });
  }
  if (kind === 'recovered' || kind === 'retry') {
    scheduleFulfillmentProcessing(orderId, traceId);
  }
  return kind === 'recovered'
    ? 'recovered'
    : kind === 'retry'
      ? 'retry'
      : kind === 'failed'
        ? 'failed'
        : kind === 'manual'
          ? 'manual'
          : 'noop';
}

/**
 * One worker tick: detect (logs) + recover. Uses a fresh trace id when not in request context.
 */
export async function runProcessingRecoveryTick() {
  const traceId = randomUUID();
  return runWithTrace(traceId, async () => {
    if (!env.processingRecoveryEnabled) {
      return { enabled: false };
    }
    const detected = await detectStuckOrders({ traceId, limit: 50 });
    const stats = await recoverStuckOrders({ traceId, limit: 50 });
    const { runManualRequiredAlertScan } = await import(
      './manualStuckOrderService.js'
    );
    await runManualRequiredAlertScan(traceId);
    return { ...stats, stuckDetected: detected.length };
  });
}
