import { randomUUID } from 'node:crypto';

import { env } from '../../config/env.js';
import { FULFILLMENT_STATUS } from '../../domain/topupOrder/statuses.js';
import { prisma } from '../../db.js';
import { webTopupCorrelationFields, webTopupLog } from '../../lib/webTopupObservability.js';
import { emitWebTopupSlaWorkerLogs } from '../../lib/webtopSlaPolicy.js';
import { evaluateAndEnforceWebtopSlaForRow, runWebTopupSlaEnforcementScan } from '../../lib/webtopSlaEnforcement.js';
import { runWebTopupStripeFallbackPoller } from '../topupOrder/webtopupStripeFallbackPoller.js';
import { processWebTopupFulfillmentAutoRetries } from './webtopFulfillmentAutoRetryWorker.js';
import { executeWebTopupFulfillmentProviderPhase } from './webTopupFulfillmentExecutor.js';
import {
  completeWebTopupFulfillmentIdempotency,
  failWebTopupFulfillmentIdempotency,
} from './webtopFulfillmentIdempotency.js';

const BACKOFF_MS = [2_000, 5_000, 15_000, 60_000, 120_000];

/**
 * @param {string} dedupeKey format twf:{orderId}:{attemptNo}
 */
function attemptNoFromDedupeKey(dedupeKey) {
  const parts = String(dedupeKey).split(':');
  const n = parseInt(parts[parts.length - 1] ?? '1', 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/**
 * Re-queue jobs stuck in `processing` past the lease (worker crash / hung provider).
 * @param {{ log?: import('pino').Logger }} [opts]
 * @returns {Promise<number>} rows recovered
 */
export async function recoverStaleWebTopupFulfillmentJobs(opts = {}) {
  const log = opts.log;
  const leaseMs = env.webtopupFulfillmentJobLeaseMs;
  const staleBefore = new Date(Date.now() - leaseMs);

  const recovered = await prisma.webTopupFulfillmentJob.updateMany({
    where: {
      status: 'processing',
      OR: [
        { processingStartedAt: { not: null, lt: staleBefore } },
        { processingStartedAt: null, updatedAt: { lt: staleBefore } },
      ],
    },
    data: {
      status: 'queued',
      nextRunAt: new Date(),
      lastError: 'stale_processing_lease_expired',
      processingStartedAt: null,
    },
  });

  if (recovered.count > 0) {
    webTopupLog(log, 'warn', 'fulfillment_job_stale_detected', {
      recoveredCount: recovered.count,
      leaseMs,
      staleBefore: staleBefore.toISOString(),
    });
    webTopupLog(log, 'info', 'fulfillment_job_recovered', {
      recoveredCount: recovered.count,
      reason: 'stale_processing_lease_expired',
    });
  }

  return recovered.count;
}

/**
 * Operator snapshot: job table + order fulfillment backlog / stale heuristics.
 */
export async function getWebTopupFulfillmentQueueHealthSnapshot() {
  const now = new Date();
  const sqMs = env.webtopupFulfillmentStaleQueuedOrderMs;
  const spMs = env.webtopupFulfillmentStaleProcessingOrderMs;
  const staleQueuedCutoff = new Date(now.getTime() - sqMs);
  const staleProcessingCutoff = new Date(now.getTime() - spMs);

  const jobGroups = await prisma.webTopupFulfillmentJob.groupBy({
    by: ['status'],
    _count: { _all: true },
  });
  const orderQueued = await prisma.webTopupOrder.count({
    where: { fulfillmentStatus: FULFILLMENT_STATUS.QUEUED },
  });
  const orderProcessing = await prisma.webTopupOrder.count({
    where: { fulfillmentStatus: FULFILLMENT_STATUS.PROCESSING },
  });
  const staleQueuedOrders = await prisma.webTopupOrder.count({
    where: {
      fulfillmentStatus: FULFILLMENT_STATUS.QUEUED,
      fulfillmentRequestedAt: { not: null, lt: staleQueuedCutoff },
    },
  });
  const staleProcessingOrders = await prisma.webTopupOrder.count({
    where: {
      fulfillmentStatus: FULFILLMENT_STATUS.PROCESSING,
      fulfillmentRequestedAt: { not: null, lt: staleProcessingCutoff },
    },
  });

  /** @type {Record<string, number>} */
  const jobsByStatus = {};
  for (const g of jobGroups) {
    jobsByStatus[g.status] = g._count._all;
  }

  return {
    collectedAt: now.toISOString(),
    config: {
      batchSize: env.webtopupFulfillmentJobBatchSize,
      leaseMs: env.webtopupFulfillmentJobLeaseMs,
      pollMs: env.webtopupFulfillmentJobPollMs,
      staleQueuedOrderMs: sqMs,
      staleProcessingOrderMs: spMs,
    },
    jobsByStatus,
    orderFulfillment: {
      queued: orderQueued,
      processing: orderProcessing,
      staleQueuedCount: staleQueuedOrders,
      staleProcessingCount: staleProcessingOrders,
    },
  };
}

/**
 * @param {string} orderId
 * @param {number} attemptNo
 * @param {{ clientIdempotencyKey?: string | null }} [meta]
 */
export async function enqueueWebTopupFulfillmentJob(
  orderId,
  attemptNo,
  meta = {},
) {
  const dedupeKey = `twf:${orderId}:${attemptNo}`;
  const clientIdempotencyKey =
    meta.clientIdempotencyKey && String(meta.clientIdempotencyKey).trim()
      ? String(meta.clientIdempotencyKey).trim().slice(0, 128)
      : null;

  try {
    const job = await prisma.webTopupFulfillmentJob.create({
      data: {
        orderId,
        dedupeKey,
        clientIdempotencyKey,
        status: 'queued',
        nextRunAt: new Date(),
      },
    });
    return job;
  } catch (e) {
    if (
      e &&
      typeof e === 'object' &&
      'code' in e &&
      e.code === 'P2002'
    ) {
      return prisma.webTopupFulfillmentJob.findUnique({
        where: { dedupeKey },
      });
    }
    throw e;
  }
}

/**
 * Worker drain — safe across instances: atomic `queued`→`processing` claim per job row.
 * @param {{ limit?: number; log?: import('pino').Logger }} opts
 */
export async function processWebTopupFulfillmentJobs(opts = {}) {
  const limit = opts.limit ?? env.webtopupFulfillmentJobBatchSize;
  const log = opts.log;

  await recoverStaleWebTopupFulfillmentJobs({ log });

  if (env.webtopSlaEnforcementEnabled) {
    await runWebTopupSlaEnforcementScan({
      log,
      limit: Math.min(20, Math.max(5, limit)),
    });
  }

  await runWebTopupStripeFallbackPoller({ log, limit: Math.min(100, limit + 5) });

  if (env.webtopupAutoRetryEnabled) {
    await processWebTopupFulfillmentAutoRetries({ limit, log });
  }

  const jobs = await prisma.webTopupFulfillmentJob.findMany({
    where: {
      status: 'queued',
      nextRunAt: { lte: new Date() },
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  for (const job of jobs) {
    const claimed = await prisma.webTopupFulfillmentJob.updateMany({
      where: { id: job.id, status: 'queued' },
      data: {
        status: 'processing',
        updatedAt: new Date(),
        processingStartedAt: new Date(),
      },
    });
    if (claimed.count !== 1) continue;

    const traceId = randomUUID().replace(/-/g, '').slice(0, 24);
    webTopupLog(log, 'info', 'fulfillment_job_claimed', {
      ...webTopupCorrelationFields(job.orderId, null, traceId),
      jobId: job.id,
      dedupeKeySuffix: job.dedupeKey.slice(-24),
      statusTransition: 'queued_to_processing',
    });

    const orderPeek = await prisma.webTopupOrder.findUnique({
      where: { id: job.orderId },
      select: { fulfillmentStatus: true, id: true },
    });

    if (!orderPeek) {
      await prisma.webTopupFulfillmentJob.update({
        where: { id: job.id },
        data: {
          status: 'dead_letter',
          lastError: 'order_not_found',
          processingStartedAt: null,
        },
      });
      webTopupLog(log, 'warn', 'fulfillment_job_processing_completed', {
        ...webTopupCorrelationFields(job.orderId, null, traceId),
        jobId: job.id,
        outcome: 'dead_letter',
        reason: 'order_not_found',
      });
      continue;
    }

    if (orderPeek.fulfillmentStatus === FULFILLMENT_STATUS.DELIVERED) {
      const attemptNo = attemptNoFromDedupeKey(job.dedupeKey);
      await prisma.webTopupFulfillmentJob.update({
        where: { id: job.id },
        data: { status: 'completed', lastError: null, processingStartedAt: null },
      });
      const fin = await prisma.webTopupOrder.findUnique({ where: { id: job.orderId } });
      await completeWebTopupFulfillmentIdempotency(
        job.orderId,
        job.clientIdempotencyKey ?? '',
        {
          attemptNumber: attemptNo,
          fulfillmentStatus: fin?.fulfillmentStatus ?? null,
          fulfillmentErrorCode: fin?.fulfillmentErrorCode ?? null,
        },
      );
      webTopupLog(log, 'info', 'fulfillment_job_processing_completed', {
        ...webTopupCorrelationFields(job.orderId, null, traceId),
        jobId: job.id,
        outcome: 'completed',
        reason: 'already_delivered',
      });
      continue;
    }

    if (orderPeek.fulfillmentStatus !== FULFILLMENT_STATUS.QUEUED) {
      await prisma.webTopupFulfillmentJob.update({
        where: { id: job.id },
        data: {
          status: 'queued',
          lastError: `deferred:order_state_${orderPeek.fulfillmentStatus}`,
          nextRunAt: new Date(Date.now() + 5_000),
          processingStartedAt: null,
        },
      });
      webTopupLog(log, 'warn', 'fulfillment_job_deferred', {
        ...webTopupCorrelationFields(job.orderId, null, traceId),
        jobId: job.id,
        fulfillmentStatus: orderPeek.fulfillmentStatus,
      });
      continue;
    }

    webTopupLog(log, 'info', 'fulfillment_job_processing_started', {
      ...webTopupCorrelationFields(job.orderId, null, traceId),
      jobId: job.id,
    });

    const attemptNo = attemptNoFromDedupeKey(job.dedupeKey);

    const orderRowForSla = await prisma.webTopupOrder.findUnique({ where: { id: job.orderId } });
    if (orderRowForSla) {
      if (env.webtopSlaEnforcementEnabled) {
        const slaOut = await evaluateAndEnforceWebtopSlaForRow(orderRowForSla, {
          log,
          mode: 'enforce',
          traceId,
        });
        if (slaOut.slaStatus === 'warn') {
          emitWebTopupSlaWorkerLogs(orderRowForSla, log, traceId);
        }
      } else {
        emitWebTopupSlaWorkerLogs(orderRowForSla, log, traceId);
      }
    }

    try {
      const phase = await executeWebTopupFulfillmentProviderPhase(
        job.orderId,
        log,
        { traceId },
      );

      if (phase && phase.finished === false) {
        await prisma.webTopupFulfillmentJob.update({
          where: { id: job.id },
          data: {
            status: 'queued',
            lastError: `deferred:${phase.reason ?? 'not_ready'}`,
            nextRunAt: new Date(Date.now() + 3_000),
            processingStartedAt: null,
          },
        });
        webTopupLog(log, 'info', 'fulfillment_job_processing_completed', {
          ...webTopupCorrelationFields(job.orderId, null, traceId),
          jobId: job.id,
          outcome: 'requeued',
          reason: phase.reason ?? 'not_ready',
        });
        continue;
      }

      await prisma.webTopupFulfillmentJob.update({
        where: { id: job.id },
        data: { status: 'completed', lastError: null, processingStartedAt: null },
      });

      const fin = await prisma.webTopupOrder.findUnique({
        where: { id: job.orderId },
      });
      await completeWebTopupFulfillmentIdempotency(
        job.orderId,
        job.clientIdempotencyKey ?? '',
        {
          attemptNumber: attemptNo,
          fulfillmentStatus: fin?.fulfillmentStatus ?? null,
          fulfillmentErrorCode: fin?.fulfillmentErrorCode ?? null,
        },
      );
      webTopupLog(log, 'info', 'fulfillment_job_processing_completed', {
        ...webTopupCorrelationFields(job.orderId, null, traceId),
        jobId: job.id,
        outcome: 'completed',
      });
    } catch (err) {
      const msg = String(err?.message ?? err).slice(0, 500);
      const nextAttempt = job.attempt + 1;
      const dead = nextAttempt >= job.maxAttempts;
      if (dead) {
        await prisma.webTopupFulfillmentJob.update({
          where: { id: job.id },
          data: {
            status: 'dead_letter',
            lastError: msg,
            attempt: nextAttempt,
            processingStartedAt: null,
          },
        });
        await failWebTopupFulfillmentIdempotency(
          job.orderId,
          job.clientIdempotencyKey ?? '',
        );
      } else {
        const delay =
          BACKOFF_MS[Math.min(nextAttempt - 1, BACKOFF_MS.length - 1)] ?? 60_000;
        await prisma.webTopupFulfillmentJob.update({
          where: { id: job.id },
          data: {
            status: 'queued',
            attempt: nextAttempt,
            lastError: msg,
            nextRunAt: new Date(Date.now() + delay),
            processingStartedAt: null,
          },
        });
      }
      webTopupLog(log, 'warn', 'fulfillment_job_processing_completed', {
        ...webTopupCorrelationFields(job.orderId, null, traceId),
        jobId: job.id,
        outcome: dead ? 'dead_letter' : 'requeued_error',
        errName: err && typeof err === 'object' && 'name' in err ? String(err.name) : undefined,
      });
    }
  }
}
