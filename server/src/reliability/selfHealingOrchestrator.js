/**
 * L7 self-healing orchestrator — health probes, safe fulfillment redispatch, quarantine metadata, aggregated report.
 * Does not auto-mark PAID, does not post ledger, does not bypass fraud or region controls.
 */

import Redis from 'ioredis';

import { prisma as defaultPrisma } from '../db.js';
import { env } from '../config/env.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../constants/fulfillmentAttemptStatus.js';
import { isFulfillmentQueueEnabled } from '../queues/queueEnabled.js';
import { scheduleFulfillmentProcessing } from '../services/fulfillmentProcessingService.js';
import { classifyFailure, FAILURE_CLASS } from './failureClassifier.js';
import {
  emitReliabilityHealthSnapshot,
  emitReliabilityRecoveryAttempted,
  emitReliabilityRecoveryBlocked,
  emitReliabilityRecoverySucceeded,
  getReliabilityRecentSamples,
} from './reliabilityL7Log.js';

/** @typedef {import('@prisma/client').PrismaClient} PrismaClient */

/**
 * @param {unknown} v
 * @returns {string}
 */
function suffix12(v) {
  const s = String(v ?? '');
  return s.length <= 12 ? s : s.slice(-12);
}

/**
 * @param {{ prisma?: PrismaClient, traceId?: string | null }} [opts]
 */
export async function evaluateSystemHealth(opts = {}) {
  const client = opts.prisma ?? defaultPrisma;
  const traceId = opts.traceId ?? null;

  /** @type {{ dbReady: boolean, redisReady: string, queueReady: string }} */
  const out = {
    dbReady: false,
    redisReady: 'skipped',
    queueReady: isFulfillmentQueueEnabled() ? 'enabled' : 'disabled',
  };

  try {
    await client.$queryRaw`SELECT 1`;
    out.dbReady = true;
  } catch {
    out.dbReady = false;
  }

  const redisUrl = String(process.env.REDIS_URL ?? env.redisUrl ?? '').trim();
  if (redisUrl) {
    const r = new Redis(redisUrl, {
      maxRetriesPerRequest: 2,
      connectTimeout: 4000,
      enableReadyCheck: true,
      lazyConnect: true,
    });
    try {
      await r.connect();
      await r.ping();
      out.redisReady = 'ok';
    } catch {
      out.redisReady = 'error';
    } finally {
      r.disconnect();
    }
  }

  const dbClass = out.dbReady
    ? null
    : classifyFailure({ signal: 'db_unavailable', source: 'evaluateSystemHealth' });
  const redisClass =
    out.redisReady === 'error'
      ? classifyFailure({ signal: 'redis_unavailable', source: 'evaluateSystemHealth' })
      : null;

  /** DB loss is fail-closed; Redis degradation alone does not halt classification/reporting. */
  const failClosed = Boolean(dbClass?.failureClass === FAILURE_CLASS.DB_UNAVAILABLE);

  emitReliabilityHealthSnapshot({
    traceId,
    layer: 'l7',
    dbReady: out.dbReady,
    redisReady: out.redisReady,
    queueReady: out.queueReady,
    failClosedRecommendation: failClosed,
  });

  return {
    ...out,
    failClosedRecommendation: failClosed,
    classifications: [dbClass, redisClass].filter(Boolean),
  };
}

/**
 * @param {{ prisma?: PrismaClient, staleProcessingMs?: number, traceId?: string | null }} [opts]
 */
export async function evaluateMoneyPathHealth(opts = {}) {
  const client = opts.prisma ?? defaultPrisma;
  const traceId = opts.traceId ?? null;
  const staleMs = opts.staleProcessingMs ?? 600_000;
  const cutoff = new Date(Date.now() - staleMs);

  let staleProcessingCount = 0;
  let paidIdleRoughCount = 0;

  try {
    staleProcessingCount = await client.fulfillmentAttempt.count({
      where: {
        status: FULFILLMENT_ATTEMPT_STATUS.PROCESSING,
        startedAt: { lt: cutoff },
      },
    });

    const paidIdleSince = new Date(Date.now() - staleMs);
    paidIdleRoughCount = await client.paymentCheckout.count({
      where: {
        orderStatus: ORDER_STATUS.PAID,
        updatedAt: { lt: paidIdleSince },
      },
    });
  } catch {
    staleProcessingCount = -1;
    paidIdleRoughCount = -1;
  }

  emitReliabilityHealthSnapshot({
    traceId,
    layer: 'l7_money_path',
    staleProcessingCount,
    paidIdleRoughCount,
  });

  return {
    staleProcessingCount,
    paidIdleRoughCount,
    staleProcessingClass:
      staleProcessingCount > 0
        ? classifyFailure({ signal: 'fulfillment_stale_processing' })
        : null,
  };
}

/**
 * Safe recovery: idempotent fulfillment redispatch for stale PROCESSING attempts on paid pipeline orders.
 * Never transitions payment state to PAID.
 *
 * @param {{
 *   prisma?: PrismaClient,
 *   staleMs?: number,
 *   maxOrders?: number,
 *   traceId?: string | null,
 *   scheduleFulfillmentProcessingFn?: typeof scheduleFulfillmentProcessing,
 * }} [opts]
 */
export async function recoverStaleFulfillmentJobs(opts = {}) {
  const client = opts.prisma ?? defaultPrisma;
  const staleMs = opts.staleMs ?? 600_000;
  const maxOrders = opts.maxOrders ?? 20;
  const parentTrace = opts.traceId ?? `l7-recovery:${Date.now()}`;
  const scheduleFn =
    opts.scheduleFulfillmentProcessingFn ?? scheduleFulfillmentProcessing;

  const cutoff = new Date(Date.now() - staleMs);
  /** @type {{ orderId: string, attemptIdSuffix: string, outcome: string }[]} */
  const results = [];

  let rows = [];
  try {
    rows = await client.fulfillmentAttempt.findMany({
      where: {
        status: FULFILLMENT_ATTEMPT_STATUS.PROCESSING,
        startedAt: { lt: cutoff },
      },
      select: { id: true, orderId: true },
      take: maxOrders * 3,
    });
  } catch (e) {
    emitReliabilityRecoveryBlocked({
      traceId: parentTrace,
      failureClass: FAILURE_CLASS.DB_UNAVAILABLE,
      reason: 'recover_stale_query_failed',
      message: String(e?.message ?? e).slice(0, 120),
    });
    return { ok: false, attempted: 0, results };
  }

  const seen = new Set();
  for (const row of rows) {
    if (results.length >= maxOrders) break;
    const orderId = row.orderId;
    if (seen.has(orderId)) continue;

    let order;
    try {
      order = await client.paymentCheckout.findUnique({
        where: { id: orderId },
        select: { orderStatus: true },
      });
    } catch {
      continue;
    }
    if (!order) continue;
    if (
      order.orderStatus !== ORDER_STATUS.PAID &&
      order.orderStatus !== ORDER_STATUS.PROCESSING
    ) {
      emitReliabilityRecoveryBlocked({
        traceId: parentTrace,
        orderIdSuffix: suffix12(orderId),
        failureClass: FAILURE_CLASS.UNKNOWN_MONEY_PATH_FAILURE,
        reason: 'skip_non_paid_pipeline_order',
      });
      continue;
    }

    seen.add(orderId);
    const traceId = `${parentTrace}:${suffix12(orderId)}`;
    emitReliabilityRecoveryAttempted({
      traceId,
      orderIdSuffix: suffix12(orderId),
      failureClass: FAILURE_CLASS.FULFILLMENT_STALE_PROCESSING,
      safeRecoveryAction: 'schedule_fulfillment_redispatch',
    });
    try {
      scheduleFn(orderId, traceId);
      results.push({
        orderId,
        attemptIdSuffix: suffix12(row.id),
        outcome: 'scheduled',
      });
      emitReliabilityRecoverySucceeded({
        traceId,
        orderIdSuffix: suffix12(orderId),
        failureClass: FAILURE_CLASS.FULFILLMENT_STALE_PROCESSING,
      });
    } catch (e) {
      results.push({
        orderId,
        attemptIdSuffix: suffix12(row.id),
        outcome: 'error',
      });
      emitReliabilityRecoveryBlocked({
        traceId,
        orderIdSuffix: suffix12(orderId),
        failureClass: FAILURE_CLASS.UNKNOWN_MONEY_PATH_FAILURE,
        reason: 'schedule_failed',
        message: String(e?.message ?? e).slice(0, 120),
      });
    }
  }

  return { ok: true, attempted: results.length, results };
}

/**
 * Soft quarantine: metadata flag + notes — does not change payment truth or ledger.
 *
 * @param {string} orderId
 * @param {string} reason
 * @param {{ prisma?: PrismaClient }} [opts]
 */
export async function quarantineUnsafeOrder(orderId, reason, opts = {}) {
  const client = opts.prisma ?? defaultPrisma;
  const row = await client.paymentCheckout.findUnique({
    where: { id: orderId },
    select: { metadata: true },
  });
  const prev =
    row?.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? /** @type {Record<string, unknown>} */ (row.metadata)
      : {};
  const next = {
    ...prev,
    l7Quarantine: {
      at: new Date().toISOString(),
      reason: String(reason).slice(0, 500),
    },
  };
  await client.paymentCheckout.update({
    where: { id: orderId },
    data: { metadata: next },
  });
}

/**
 * @param {{
 *   prisma?: PrismaClient,
 *   traceId?: string | null,
 *   runRecovery?: boolean,
 *   recoveryStaleMs?: number,
 * }} [opts]
 */
export async function buildSelfHealingReport(opts = {}) {
  const traceId = opts.traceId ?? null;
  const sys = await evaluateSystemHealth({ prisma: opts.prisma, traceId });
  const money = await evaluateMoneyPathHealth({
    prisma: opts.prisma,
    traceId,
    staleProcessingMs: opts.recoveryStaleMs ?? 600_000,
  });

  /** @type {string[]} */
  const recoveryActions = [];
  if (!sys.dbReady) recoveryActions.push('fail_closed:restore_database_connectivity');
  if (sys.redisReady === 'error') recoveryActions.push('degraded:restore_redis_or_run_without');
  if (money.staleProcessingCount > 0)
    recoveryActions.push('safe:schedule_fulfillment_redispatch_for_stale_processing');
  if (money.paidIdleRoughCount > 0)
    recoveryActions.push('review:paid_idle_orders_operator_triage');

  let recovery = { ok: true, attempted: 0, results: [] };
  if (
    opts.runRecovery === true &&
    sys.dbReady &&
    money.staleProcessingCount > 0
  ) {
    recovery = await recoverStaleFulfillmentJobs({
      prisma: opts.prisma,
      staleMs: opts.recoveryStaleMs ?? 600_000,
      traceId,
    });
  }

  const recent = getReliabilityRecentSamples().map((r) => ({
    failureClass: r.failureClass ?? r.kind ?? 'unknown',
    severity: r.severity ?? null,
    orderIdSuffix: r.orderIdSuffix ?? null,
    traceId: r.traceId ?? null,
  }));

  const severityOrder = { critical: 3, warn: 2, info: 1 };
  let severity = /** @type {'info' | 'warn' | 'critical'} */ ('info');
  if (sys.failClosedRecommendation) severity = 'critical';
  else if (money.staleProcessingCount > 0 || money.paidIdleRoughCount > 3)
    severity = 'warn';

  for (const c of sys.classifications) {
    if (c && severityOrder[c.severity] > severityOrder[severity]) severity = c.severity;
  }

  return {
    ok: !sys.failClosedRecommendation,
    severity,
    moneyPathReady: sys.dbReady && !sys.failClosedRecommendation,
    providerReady: sys.redisReady !== 'error',
    dbReady: sys.dbReady,
    redisReady: sys.redisReady,
    queueReady: sys.queueReady,
    staleProcessingCount: money.staleProcessingCount,
    paidIdleRoughCount: money.paidIdleRoughCount,
    recentFailures: recent,
    recoveryActions,
    recoveryRun: recovery,
    failClosedRecommendation: sys.failClosedRecommendation,
  };
}
