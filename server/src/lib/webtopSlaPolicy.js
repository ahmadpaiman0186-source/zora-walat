/**
 * Unified WebTopup SLA / timeout evaluation (aligned with reconciliation thresholds).
 * Evaluation is pure; mutations live in `webtopSlaEnforcement.js`.
 */

import { env } from '../config/env.js';
import { PAYMENT_STATUS, FULFILLMENT_STATUS } from '../domain/topupOrder/statuses.js';
import { isPersistedFulfillmentErrorRetryable } from '../domain/topupOrder/webtopFulfillmentAutoRetryPolicy.js';
import { prisma } from '../db.js';
import { webTopupLog } from './webTopupObservability.js';

/** Persisted `fulfillmentErrorCode` values used by SLA enforcement (see auto-retry policy allowlists). */
export const WEBTOP_SLA_ERROR_CODES = Object.freeze({
  TIMEOUT_TOTAL: 'sla_timeout_total',
  STALE_PROCESSING: 'sla_stale_processing',
  STALE_QUEUED: 'sla_stale_queued',
});

/** @type {Map<string, number>} orderId -> last sla log ms (worker dedupe) */
const workerSlaLogDedupe = new Map();
const WORKER_SLA_LOG_MIN_MS = 5 * 60 * 1000;

/**
 * Thresholds for evaluation + operator docs (ms).
 */
export function getWebtopSlaThresholds() {
  return {
    paymentPendingMaxMs: env.webtopSlaPaymentPendingMaxMs,
    paidFulfillmentPendingMaxMs: env.reconcilePaidStuckAfterMs,
    fulfillmentQueuedMaxMs: env.reconcileFulfillmentQueuedStuckAfterMs,
    fulfillmentProcessingMaxMs: env.reconcileFulfillmentProcessingStuckAfterMs,
    paidToDeliveredMaxMs: env.webtopSlaPaidToDeliveredMaxMs,
    warnRatio: env.webtopSlaWarnRatio,
    paidToDeliveredWarnRatio: env.webtopSlaPaidToDeliveredWarnRatio,
  };
}

/**
 * Canonical instant when payment became paid (for paid→delivered SLA). Falls back for legacy rows.
 * @param {import('@prisma/client').WebTopupOrder | Record<string, unknown>} row
 * @param {number} nowMs
 */
export function resolveWebTopupPaidAtMs(row, nowMs) {
  if (row.paidAt) {
    const t = new Date(row.paidAt).getTime();
    if (Number.isFinite(t)) return t;
  }
  if (String(row.paymentStatus ?? '') === PAYMENT_STATUS.PAID) {
    if (row.updatedAt) return new Date(row.updatedAt).getTime();
    if (row.createdAt) return new Date(row.createdAt).getTime();
  }
  return nowMs;
}

/**
 * Whether paid→delivered elapsed SLA applies (excludes terminal delivered / terminal non-retryable failed).
 */
export function shouldEvaluatePaidToDeliveredSegment(row, nowMs) {
  const p = String(row.paymentStatus ?? '');
  const f = String(row.fulfillmentStatus ?? '');
  if (p !== PAYMENT_STATUS.PAID) return false;
  if (f === FULFILLMENT_STATUS.DELIVERED) return false;
  if (f === FULFILLMENT_STATUS.FAILED) {
    const nr = row.fulfillmentNextRetryAt
      ? new Date(row.fulfillmentNextRetryAt).getTime()
      : null;
    if (nr != null && nr > nowMs) return true;
    return isPersistedFulfillmentErrorRetryable(row.fulfillmentErrorCode);
  }
  return true;
}

/** Reconciliation engine contract — single source for classifyWebTopupMoneyPath. */
export function getWebtopSlaThresholdsForReconciliation() {
  const t = getWebtopSlaThresholds();
  return {
    paidStuckMs: t.paidFulfillmentPendingMaxMs,
    queuedStuckMs: t.fulfillmentQueuedMaxMs,
    processingStuckMs: t.fulfillmentProcessingMaxMs,
  };
}

/**
 * @param {'ok'|'warn'|'breached'} a
 * @param {'ok'|'warn'|'breached'} b
 */
function worse(a, b) {
  const rank = { ok: 0, warn: 1, breached: 2 };
  return rank[b] > rank[a] ? b : a;
}

/**
 * @param {number} elapsedMs
 * @param {number} thresholdMs
 * @param {number} warnRatio
 */
function segmentStatus(elapsedMs, thresholdMs, warnRatio) {
  if (!(thresholdMs > 0)) return 'ok';
  if (elapsedMs >= thresholdMs) return 'breached';
  if (elapsedMs >= thresholdMs * warnRatio) return 'warn';
  return 'ok';
}

/**
 * @param {import('@prisma/client').WebTopupOrder | Record<string, unknown>} row
 * @param {Date} now
 * @param {ReturnType<typeof getWebtopSlaThresholds>} [thresholds]
 */
export function evaluateWebtopOrderSla(row, now, thresholds = getWebtopSlaThresholds()) {
  const p = String(row.paymentStatus ?? '');
  const f = String(row.fulfillmentStatus ?? '');
  const t = thresholds;
  const warnRatio = t.warnRatio;

  /** @type {Record<string, { elapsedMs: number; thresholdMs: number; warnAtMs: number; status: 'ok'|'warn'|'breached' }>} */
  const segments = {};

  let agg = /** @type {'ok'|'warn'|'breached'} */ ('ok');
  /** @type {string[]} */
  const reasons = [];

  const createdAt = row.createdAt ? new Date(row.createdAt).getTime() : now.getTime();
  const updatedAt = row.updatedAt ? new Date(row.updatedAt).getTime() : createdAt;
  const reqAt = row.fulfillmentRequestedAt
    ? new Date(row.fulfillmentRequestedAt).getTime()
    : null;
  const nextRetryAt = row.fulfillmentNextRetryAt
    ? new Date(row.fulfillmentNextRetryAt).getTime()
    : null;
  const nowMs = now.getTime();

  if (p === PAYMENT_STATUS.PENDING) {
    const elapsedMs = nowMs - createdAt;
    const thresholdMs = t.paymentPendingMaxMs;
    const st = segmentStatus(elapsedMs, thresholdMs, warnRatio);
    segments.paymentPending = {
      elapsedMs,
      thresholdMs,
      warnAtMs: thresholdMs * warnRatio,
      status: st,
    };
    agg = worse(agg, st);
    if (st === 'breached') reasons.push('payment_pending_timeout');
    else if (st === 'warn') reasons.push('payment_pending_warn');
  }

  if (p === PAYMENT_STATUS.PAID && f === FULFILLMENT_STATUS.PENDING) {
    const elapsedMs = nowMs - updatedAt;
    const thresholdMs = t.paidFulfillmentPendingMaxMs;
    const st = segmentStatus(elapsedMs, thresholdMs, warnRatio);
    segments.paidFulfillmentPending = {
      elapsedMs,
      thresholdMs,
      warnAtMs: thresholdMs * warnRatio,
      status: st,
    };
    agg = worse(agg, st);
    if (st === 'breached') reasons.push('stale_pending_after_payment');
    else if (st === 'warn') reasons.push('stale_pending_after_payment_warn');
  }

  if (p === PAYMENT_STATUS.PAID && f === FULFILLMENT_STATUS.QUEUED && reqAt != null) {
    const elapsedMs = nowMs - reqAt;
    const thresholdMs = t.fulfillmentQueuedMaxMs;
    const st = segmentStatus(elapsedMs, thresholdMs, warnRatio);
    segments.fulfillmentQueued = {
      elapsedMs,
      thresholdMs,
      warnAtMs: thresholdMs * warnRatio,
      status: st,
    };
    agg = worse(agg, st);
    if (st === 'breached') reasons.push('stale_queued');
    else if (st === 'warn') reasons.push('stale_queued_warn');
  }

  const waitingForScheduledRetry =
    f === FULFILLMENT_STATUS.RETRYING &&
    nextRetryAt != null &&
    nowMs < nextRetryAt;

  if (
    p === PAYMENT_STATUS.PAID &&
    (f === FULFILLMENT_STATUS.PROCESSING || f === FULFILLMENT_STATUS.RETRYING) &&
    reqAt != null &&
    !waitingForScheduledRetry
  ) {
    const elapsedMs = nowMs - reqAt;
    const thresholdMs = t.fulfillmentProcessingMaxMs;
    const st = segmentStatus(elapsedMs, thresholdMs, warnRatio);
    segments.fulfillmentProcessing = {
      elapsedMs,
      thresholdMs,
      warnAtMs: thresholdMs * warnRatio,
      status: st,
    };
    agg = worse(agg, st);
    if (st === 'breached') reasons.push('stale_processing');
    else if (st === 'warn') reasons.push('stale_processing_warn');
  }

  if (shouldEvaluatePaidToDeliveredSegment(row, nowMs)) {
    const paidAtMs = resolveWebTopupPaidAtMs(row, nowMs);
    const elapsedMs = nowMs - paidAtMs;
    const thresholdMs = t.paidToDeliveredMaxMs;
    const pwr = t.paidToDeliveredWarnRatio;
    const st = segmentStatus(elapsedMs, thresholdMs, pwr);
    segments.paidToDelivered = {
      elapsedMs,
      thresholdMs,
      warnAtMs: thresholdMs * pwr,
      status: st,
    };
    agg = worse(agg, st);
    if (st === 'breached') reasons.push('paid_to_delivered_breach');
    else if (st === 'warn') reasons.push('paid_to_delivered_warn');
  }

  const slaStatus = agg;
  const slaReason =
    reasons.find((r) => !String(r).includes('warn')) ?? reasons[0] ?? null;

  const base = {
    slaStatus,
    slaReason,
    slaReasons: reasons,
    segments,
    evaluatedAt: now.toISOString(),
    thresholds: { ...t },
  };
  return {
    ...base,
    ...buildWebtopSlaVisibility(row, base, now),
  };
}

/**
 * Operator / API fields: time-to-breach, retry window, recommended vs inferred executed action.
 * @param {import('@prisma/client').WebTopupOrder | Record<string, unknown>} row
 * @param {{ segments: Record<string, { elapsedMs: number; thresholdMs: number; status: string }> }} ev
 * @param {Date} [now]
 */
export function buildWebtopSlaVisibility(row, ev, now = new Date()) {
  const nowMs = now.getTime();
  /** @type {number | null} */
  let remainingTimeMs = null;
  for (const seg of Object.values(ev.segments)) {
    if (!seg || typeof seg.elapsedMs !== 'number') continue;
    if (seg.status === 'breached') continue;
    const left = seg.thresholdMs - seg.elapsedMs;
    if (left >= 0) {
      const floor = Math.floor(left);
      if (remainingTimeMs == null || floor < remainingTimeMs) remainingTimeMs = floor;
    }
  }
  const nr = row.fulfillmentNextRetryAt
    ? new Date(row.fulfillmentNextRetryAt).getTime()
    : null;
  const retryWindowRemainingMs =
    nr != null && nr > nowMs ? Math.max(0, Math.floor(nr - nowMs)) : 0;

  return {
    remainingTimeMs:
      remainingTimeMs != null ? Math.max(0, remainingTimeMs) : null,
    retryWindowRemainingMs,
    slaActionRecommended: recommendWebtopSlaAction(ev, row),
    slaActionExecuted: inferSlaActionExecutedFromRow(row),
  };
}

/**
 * @param {{ slaStatus: string; slaReasons: string[] }} ev
 * @param {import('@prisma/client').WebTopupOrder | Record<string, unknown>} row
 * @returns {'none'|'retry_now'|'force_dispatch'|'mark_failed'}
 */
export function recommendWebtopSlaAction(ev, row) {
  if (ev.slaStatus === 'ok') return 'none';
  const reasons = ev.slaReasons.filter((r) => !String(r).includes('warn'));
  const has = (x) => reasons.some((r) => r === x);
  if (has('stale_pending_after_payment')) return 'force_dispatch';
  if (has('stale_queued')) return 'force_dispatch';
  if (has('stale_processing')) return 'retry_now';
  if (has('paid_to_delivered_breach')) {
    const attempts = row.fulfillmentAttemptCount ?? 0;
    if (attempts >= env.webtopupAutoRetryMaxDispatchAttempts) return 'mark_failed';
    return 'retry_now';
  }
  return 'none';
}

/**
 * Best-effort inference from persisted row (SLA error codes), not a durable audit log.
 * @param {import('@prisma/client').WebTopupOrder | Record<string, unknown>} row
 * @returns {'retry_now'|'mark_failed'|null}
 */
export function inferSlaActionExecutedFromRow(row) {
  const c = String(row.fulfillmentErrorCode ?? '').trim();
  if (c === WEBTOP_SLA_ERROR_CODES.TIMEOUT_TOTAL) return 'mark_failed';
  if (c === WEBTOP_SLA_ERROR_CODES.STALE_PROCESSING) return 'retry_now';
  return null;
}

/**
 * Emit structured SLA logs from worker (deduped per order / few minutes).
 * @param {import('@prisma/client').WebTopupOrder} row
 * @param {import('pino').Logger | undefined} log
 * @param {string | undefined} traceId
 */
export function emitWebTopupSlaWorkerLogs(row, log, traceId) {
  const ev = evaluateWebtopOrderSla(row, new Date());
  if (ev.slaStatus === 'ok') return;

  const id = String(row.id ?? '');
  const now = Date.now();
  const last = workerSlaLogDedupe.get(id) ?? 0;
  if (now - last < WORKER_SLA_LOG_MIN_MS) return;
  workerSlaLogDedupe.set(id, now);

  if (ev.slaStatus === 'breached') {
    webTopupLog(log, 'warn', 'sla_violation_detected', {
      orderIdSuffix: id.slice(-8),
      traceId,
      slaReason: ev.slaReason,
      slaReasons: ev.slaReasons,
      paymentStatus: row.paymentStatus,
      fulfillmentStatus: row.fulfillmentStatus,
      context: 'fulfillment_worker',
    });
  } else {
    webTopupLog(log, 'info', 'sla_warning_detected', {
      orderIdSuffix: id.slice(-8),
      traceId,
      slaReason: ev.slaReason,
      slaReasons: ev.slaReasons,
      paymentStatus: row.paymentStatus,
      fulfillmentStatus: row.fulfillmentStatus,
      context: 'fulfillment_worker',
    });
  }
}

/** Test helper */
export function __resetWebtopSlaWorkerDedupeForTests() {
  workerSlaLogDedupe.clear();
}

/**
 * Approximate DB counts of orders past SLA thresholds (admin monitoring).
 * Never throws — monitoring must stay available if the DB is under pressure.
 */
export async function getWebtopSlaAggregateSnapshot() {
  const now = new Date();
  const empty = {
    collectedAt: now.toISOString(),
    breachedApproximateCounts: {
      paymentPendingTimeout: 0,
      stalePendingAfterPayment: 0,
      staleQueued: 0,
      staleProcessing: 0,
    },
    aggregateError: /** @type {string | undefined} */ (undefined),
  };

  try {
    const t = getWebtopSlaThresholds();
    const paymentCutoff = new Date(now.getTime() - t.paymentPendingMaxMs);
    const paidPendingCutoff = new Date(now.getTime() - t.paidFulfillmentPendingMaxMs);
    const queuedCutoff = new Date(now.getTime() - t.fulfillmentQueuedMaxMs);
    const processingCutoff = new Date(now.getTime() - t.fulfillmentProcessingMaxMs);

    /** Sequential queries — avoids connection spikes vs `Promise.all` under test/concurrency. */
    const paymentPendingBreached = await prisma.webTopupOrder.count({
      where: { paymentStatus: PAYMENT_STATUS.PENDING, createdAt: { lt: paymentCutoff } },
    });
    const paidFulfillmentPendingBreached = await prisma.webTopupOrder.count({
      where: {
        paymentStatus: PAYMENT_STATUS.PAID,
        fulfillmentStatus: FULFILLMENT_STATUS.PENDING,
        updatedAt: { lt: paidPendingCutoff },
      },
    });
    const queuedBreached = await prisma.webTopupOrder.count({
      where: {
        fulfillmentStatus: FULFILLMENT_STATUS.QUEUED,
        fulfillmentRequestedAt: { not: null, lt: queuedCutoff },
      },
    });
    const processingBreached = await prisma.webTopupOrder.count({
      where: {
        fulfillmentStatus: { in: [FULFILLMENT_STATUS.PROCESSING, FULFILLMENT_STATUS.RETRYING] },
        fulfillmentRequestedAt: { not: null, lt: processingCutoff },
        OR: [{ fulfillmentNextRetryAt: null }, { fulfillmentNextRetryAt: { lte: now } }],
      },
    });

    return {
      collectedAt: now.toISOString(),
      breachedApproximateCounts: {
        paymentPendingTimeout: paymentPendingBreached,
        stalePendingAfterPayment: paidFulfillmentPendingBreached,
        staleQueued: queuedBreached,
        staleProcessing: processingBreached,
      },
    };
  } catch {
    return { ...empty, aggregateError: 'unavailable' };
  }
}
