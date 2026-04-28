/**
 * Active WebTopup SLA enforcement — deterministic actions aligned with `evaluateWebtopOrderSla`.
 * Does not override DELIVERED; respects retry windows (scheduled RETRYING with future nextRetryAt).
 */

import { randomUUID } from 'node:crypto';

import { env } from '../config/env.js';
import { PAYMENT_STATUS, FULFILLMENT_STATUS } from '../domain/topupOrder/statuses.js';
import { isPersistedFulfillmentErrorRetryable } from '../domain/topupOrder/webtopFulfillmentAutoRetryPolicy.js';
import { isWebTopupFinancialGuardrailErrorCode } from '../domain/topupOrder/fulfillmentErrors.js';
import { prisma } from '../db.js';
import { webTopupLog } from './webTopupObservability.js';
import {
  WEBTOP_SLA_ERROR_CODES,
  evaluateWebtopOrderSla,
  getWebtopSlaThresholds,
} from './webtopSlaPolicy.js';
import { dispatchWebTopupFulfillment } from '../services/topupFulfillment/webTopupFulfillmentService.js';

/**
 * @param {string} orderId
 * @returns {Promise<boolean>}
 */
async function hasRecentActiveProcessingJob(orderId) {
  const graceMs = env.webtopSlaEnforcementProcessingGraceMs;
  const cutoff = new Date(Date.now() - graceMs);
  const j = await prisma.webTopupFulfillmentJob.findFirst({
    where: {
      orderId,
      status: 'processing',
      processingStartedAt: { gt: cutoff },
    },
    select: { id: true },
  });
  return Boolean(j);
}

/**
 * @param {string} orderId
 */
async function bumpFulfillmentJobs(orderId) {
  return prisma.webTopupFulfillmentJob.updateMany({
    where: {
      orderId,
      status: { in: ['queued', 'processing'] },
    },
    data: {
      status: 'queued',
      nextRunAt: new Date(),
      processingStartedAt: null,
      lastError: WEBTOP_SLA_ERROR_CODES.STALE_QUEUED,
    },
  });
}

/**
 * @param {string} orderId
 * @param {import('pino').Logger | undefined} log
 * @param {string | undefined} traceId
 * @param {string} reason
 * @returns {Promise<'force_dispatch'|'none'>}
 */
async function tryForceDispatch(orderId, log, traceId, reason) {
  try {
    await dispatchWebTopupFulfillment(orderId, log, {
      traceId,
      idempotencyKey: `sla_enforce:${reason}:${orderId}:${Math.floor(Date.now() / 600_000)}`,
    });
    webTopupLog(log, 'info', 'sla_enforcement_triggered', {
      orderIdSuffix: orderId.slice(-8),
      traceId,
      action: 'force_dispatch',
      reason,
    });
    webTopupLog(log, 'info', 'sla_auto_retry_triggered', {
      orderIdSuffix: orderId.slice(-8),
      traceId,
      reason,
      mode: 'dispatch',
    });
    return 'force_dispatch';
  } catch (e) {
    webTopupLog(log, 'warn', 'sla_enforcement_dispatch_failed', {
      orderIdSuffix: orderId.slice(-8),
      traceId,
      reason,
      errCode: e && typeof e === 'object' && 'code' in e ? String(e.code) : undefined,
      message: typeof e?.message === 'string' ? e.message.slice(0, 200) : undefined,
    });
    return 'none';
  }
}

/**
 * @param {string} orderId
 * @param {import('@prisma/client').WebTopupOrder} row
 * @param {import('pino').Logger | undefined} log
 * @param {string | undefined} traceId
 */
async function enforceStaleProcessing(orderId, row, log, traceId) {
  if (await hasRecentActiveProcessingJob(orderId)) {
    webTopupLog(log, 'info', 'sla_enforcement_skipped_recent_job', {
      orderIdSuffix: orderId.slice(-8),
      traceId,
      reason: 'processing_grace_window',
    });
    return /** @type {const} */ ('none');
  }

  await prisma.webTopupFulfillmentJob.updateMany({
    where: { orderId, status: 'processing' },
    data: {
      status: 'dead_letter',
      lastError: 'sla_stale_processing_aborted',
      processingStartedAt: null,
    },
  });

  const now = new Date();
  const n = await prisma.webTopupOrder.updateMany({
    where: {
      id: orderId,
      paymentStatus: PAYMENT_STATUS.PAID,
      fulfillmentStatus: {
        in: [FULFILLMENT_STATUS.PROCESSING, FULFILLMENT_STATUS.RETRYING],
      },
      OR: [
        { fulfillmentNextRetryAt: null },
        { fulfillmentNextRetryAt: { lte: now } },
      ],
    },
    data: {
      fulfillmentStatus: FULFILLMENT_STATUS.FAILED,
      fulfillmentErrorCode: WEBTOP_SLA_ERROR_CODES.STALE_PROCESSING,
      fulfillmentFailedAt: now,
      fulfillmentNextRetryAt: now,
      fulfillmentErrorMessageSafe:
        'SLA: processing exceeded threshold; immediate auto-retry scheduled',
    },
  });

  if (n.count === 1) {
    webTopupLog(log, 'warn', 'sla_enforcement_triggered', {
      orderIdSuffix: orderId.slice(-8),
      traceId,
      action: 'retry_now',
      reason: 'stale_processing',
      previousState: row.fulfillmentStatus,
    });
    webTopupLog(log, 'warn', 'sla_auto_retry_triggered', {
      orderIdSuffix: orderId.slice(-8),
      traceId,
      reason: 'sla_stale_processing',
      mode: 'failed_retryable_immediate',
    });
    return /** @type {const} */ ('retry_now');
  }
  return /** @type {const} */ ('none');
}

/**
 * @param {string} orderId
 * @param {import('@prisma/client').WebTopupOrder} row
 * @param {import('pino').Logger | undefined} log
 * @param {string | undefined} traceId
 */
async function enforcePaidToDeliveredEscalation(orderId, row, log, traceId) {
  const f = String(row.fulfillmentStatus ?? '');
  if (f === FULFILLMENT_STATUS.PENDING) {
    return tryForceDispatch(orderId, log, traceId, 'paid_to_delivered_escalate');
  }
  if (
    f === FULFILLMENT_STATUS.QUEUED ||
    f === FULFILLMENT_STATUS.PROCESSING ||
    f === FULFILLMENT_STATUS.RETRYING
  ) {
    const r = await bumpFulfillmentJobs(orderId);
    webTopupLog(log, 'info', 'sla_enforcement_triggered', {
      orderIdSuffix: orderId.slice(-8),
      traceId,
      action: 'force_dispatch',
      reason: 'paid_to_delivered_escalate',
      jobsUpdated: r.count,
    });
    webTopupLog(log, 'info', 'sla_auto_retry_triggered', {
      orderIdSuffix: orderId.slice(-8),
      traceId,
      reason: 'paid_to_delivered_job_bump',
      mode: 'queue_bump',
    });
    return r.count > 0 ? /** @type {const} */ ('force_dispatch') : /** @type {const} */ ('none');
  }
  if (f === FULFILLMENT_STATUS.FAILED) {
    const nr = row.fulfillmentNextRetryAt
      ? new Date(row.fulfillmentNextRetryAt).getTime()
      : null;
    const nowMs = Date.now();
    if (
      isPersistedFulfillmentErrorRetryable(row.fulfillmentErrorCode) &&
      nr != null &&
      nr > nowMs
    ) {
      const u = await prisma.webTopupOrder.updateMany({
        where: {
          id: orderId,
          fulfillmentStatus: FULFILLMENT_STATUS.FAILED,
          fulfillmentNextRetryAt: { gt: new Date() },
        },
        data: { fulfillmentNextRetryAt: new Date() },
      });
      if (u.count === 1) {
        webTopupLog(log, 'info', 'sla_enforcement_triggered', {
          orderIdSuffix: orderId.slice(-8),
          traceId,
          action: 'retry_now',
          reason: 'paid_to_delivered_retry_escalation',
        });
        webTopupLog(log, 'info', 'sla_auto_retry_triggered', {
          orderIdSuffix: orderId.slice(-8),
          traceId,
          reason: 'next_retry_immediate',
          mode: 'backoff_skip',
        });
        return /** @type {const} */ ('retry_now');
      }
    }
  }
  return /** @type {const} */ ('none');
}

/**
 * @param {string} orderId
 * @param {import('pino').Logger | undefined} log
 * @param {string | undefined} traceId
 */
async function enforceTerminalTotalSla(orderId, log, traceId) {
  const now = new Date();
  const n = await prisma.webTopupOrder.updateMany({
    where: {
      id: orderId,
      paymentStatus: PAYMENT_STATUS.PAID,
      fulfillmentStatus: { not: FULFILLMENT_STATUS.DELIVERED },
      fulfillmentAttemptCount: { gte: env.webtopupAutoRetryMaxDispatchAttempts },
      fulfillmentErrorCode: { not: WEBTOP_SLA_ERROR_CODES.TIMEOUT_TOTAL },
    },
    data: {
      fulfillmentStatus: FULFILLMENT_STATUS.FAILED,
      fulfillmentErrorCode: WEBTOP_SLA_ERROR_CODES.TIMEOUT_TOTAL,
      fulfillmentFailedAt: now,
      fulfillmentNextRetryAt: null,
      fulfillmentErrorMessageSafe:
        'SLA: paid→delivered time limit exceeded; auto-retries exhausted',
    },
  });
  if (n.count === 1) {
    webTopupLog(log, 'error', 'sla_enforcement_triggered', {
      orderIdSuffix: orderId.slice(-8),
      traceId,
      action: 'mark_failed',
      reason: 'paid_to_delivered_total',
    });
    webTopupLog(log, 'error', 'sla_auto_failure_triggered', {
      orderIdSuffix: orderId.slice(-8),
      traceId,
      errorCode: WEBTOP_SLA_ERROR_CODES.TIMEOUT_TOTAL,
    });
    return /** @type {const} */ ('mark_failed');
  }
  return /** @type {const} */ ('none');
}

/**
 * @param {string} orderId
 * @param {{ log?: import('pino').Logger; mode?: 'enforce' | 'readonly'; traceId?: string }} opts
 */
export async function evaluateAndEnforceWebtopSla(orderId, opts = {}) {
  const row = await prisma.webTopupOrder.findUnique({ where: { id: orderId } });
  if (!row) {
    return {
      slaStatus: 'ok',
      actionTaken: /** @type {const} */ ('none'),
      notFound: true,
    };
  }
  return evaluateAndEnforceWebtopSlaForRow(row, opts);
}

/**
 * @param {import('@prisma/client').WebTopupOrder} row
 * @param {{ log?: import('pino').Logger; mode?: 'enforce' | 'readonly'; traceId?: string }} [opts]
 */
export async function evaluateAndEnforceWebtopSlaForRow(row, opts = {}) {
  const log = opts.log;
  const mode = opts.mode ?? 'enforce';
  const traceId = opts.traceId;
  const now = new Date();

  let ev = evaluateWebtopOrderSla(row, now);

  if (mode === 'readonly' || !env.webtopSlaEnforcementEnabled) {
    return {
      ...ev,
      actionTaken: /** @type {const} */ ('none'),
      enforcementSkipped: mode === 'readonly' ? 'readonly' : 'disabled',
    };
  }

  if (String(row.fulfillmentStatus) === FULFILLMENT_STATUS.DELIVERED) {
    return { ...ev, actionTaken: /** @type {const} */ ('none') };
  }

  if (isWebTopupFinancialGuardrailErrorCode(row.fulfillmentErrorCode)) {
    return { ...ev, actionTaken: /** @type {const} */ ('none') };
  }

  if (ev.slaStatus !== 'breached') {
    return { ...ev, actionTaken: /** @type {const} */ ('none') };
  }

  const reasons = ev.slaReasons.filter((r) => !String(r).includes('warn'));
  const has = (x) => reasons.includes(x);
  const orderId = String(row.id);

  /** @type {'none'|'retry_now'|'force_dispatch'|'mark_failed'} */
  let actionTaken = 'none';

  if (has('stale_pending_after_payment')) {
    actionTaken = await tryForceDispatch(
      orderId,
      log,
      traceId,
      'stale_pending_after_payment',
    );
  } else if (has('stale_queued')) {
    const r = await bumpFulfillmentJobs(orderId);
    if (r.count > 0) {
      actionTaken = 'force_dispatch';
      webTopupLog(log, 'info', 'sla_enforcement_triggered', {
        orderIdSuffix: orderId.slice(-8),
        traceId,
        action: 'force_dispatch',
        reason: 'stale_queued',
        jobsUpdated: r.count,
      });
      webTopupLog(log, 'info', 'sla_auto_retry_triggered', {
        orderIdSuffix: orderId.slice(-8),
        traceId,
        reason: 'stale_queued_job_bump',
        mode: 'queue_bump',
      });
    }
  } else if (has('stale_processing')) {
    const a = await enforceStaleProcessing(orderId, row, log, traceId);
    if (a !== 'none') actionTaken = a;
  } else if (has('paid_to_delivered_breach')) {
    const attempts = row.fulfillmentAttemptCount ?? 0;
    if (attempts >= env.webtopupAutoRetryMaxDispatchAttempts) {
      const t = await enforceTerminalTotalSla(orderId, log, traceId);
      if (t !== 'none') actionTaken = t;
    } else {
      const e = await enforcePaidToDeliveredEscalation(orderId, row, log, traceId);
      if (e !== 'none') actionTaken = e;
    }
  }

  const fresh = await prisma.webTopupOrder.findUnique({ where: { id: orderId } });
  ev = fresh ? evaluateWebtopOrderSla(fresh, new Date()) : ev;

  return {
    ...ev,
    actionTaken,
  };
}

/**
 * Sample likely-breach orders and run enforcement (worker tick).
 * @param {{ log?: import('pino').Logger; limit?: number }} [opts]
 */
export async function runWebTopupSlaEnforcementScan(opts = {}) {
  if (!env.webtopSlaEnforcementEnabled) {
    return { scanned: 0, actions: 0 };
  }
  const limit = Math.min(50, Math.max(1, opts.limit ?? 15));
  const log = opts.log;
  const th = getWebtopSlaThresholds();
  const paidFulfillmentPendingMaxMs = th.paidFulfillmentPendingMaxMs;
  const fulfillmentQueuedMaxMs = th.fulfillmentQueuedMaxMs;
  const fulfillmentProcessingMaxMs = th.fulfillmentProcessingMaxMs;
  const paidToDeliveredMaxMs = th.paidToDeliveredMaxMs;

  const now = Date.now();
  const cut = (ms) => new Date(now - ms);

  const candidates = await prisma.webTopupOrder.findMany({
    where: {
      paymentStatus: PAYMENT_STATUS.PAID,
      fulfillmentStatus: { not: FULFILLMENT_STATUS.DELIVERED },
      OR: [
        {
          fulfillmentStatus: FULFILLMENT_STATUS.PENDING,
          updatedAt: { lt: cut(paidFulfillmentPendingMaxMs) },
        },
        {
          fulfillmentStatus: FULFILLMENT_STATUS.QUEUED,
          fulfillmentRequestedAt: { lt: cut(fulfillmentQueuedMaxMs) },
        },
        {
          fulfillmentStatus: {
            in: [FULFILLMENT_STATUS.PROCESSING, FULFILLMENT_STATUS.RETRYING],
          },
          fulfillmentRequestedAt: { lt: cut(fulfillmentProcessingMaxMs) },
        },
        { paidAt: { lt: cut(paidToDeliveredMaxMs) } },
      ],
    },
    take: limit,
    orderBy: { updatedAt: 'asc' },
  });

  let actions = 0;
  for (const row of candidates) {
    const r = await evaluateAndEnforceWebtopSlaForRow(row, {
      log,
      mode: 'enforce',
      traceId: `sla_scan_${randomUUID().replace(/-/g, '').slice(0, 12)}`,
    });
    if (r.actionTaken && r.actionTaken !== 'none') actions += 1;
  }

  return { scanned: candidates.length, actions };
}
