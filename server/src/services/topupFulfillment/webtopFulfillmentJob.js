import { randomUUID } from 'node:crypto';

import { prisma } from '../../db.js';
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
 * Enqueue async provider execution (order must already be QUEUED).
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
 * Worker drain — safe across instances if only one row transitions via updateMany claim.
 * @param {{ limit?: number; log?: import('pino').Logger }} opts
 */
export async function processWebTopupFulfillmentJobs(opts = {}) {
  const limit = opts.limit ?? 10;
  const log = opts.log;

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
      data: { status: 'processing', updatedAt: new Date() },
    });
    if (claimed.count !== 1) continue;

    const attemptNo = attemptNoFromDedupeKey(job.dedupeKey);
    const traceId = randomUUID().replace(/-/g, '').slice(0, 16);

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
          },
        });
        continue;
      }

      await prisma.webTopupFulfillmentJob.update({
        where: { id: job.id },
        data: { status: 'completed', lastError: null },
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
    } catch (err) {
      const msg = String(err?.message ?? err).slice(0, 500);
      const nextAttempt = job.attempt + 1;
      if (nextAttempt >= job.maxAttempts) {
        await prisma.webTopupFulfillmentJob.update({
          where: { id: job.id },
          data: {
            status: 'dead_letter',
            lastError: msg,
            attempt: nextAttempt,
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
          },
        });
      }
    }
  }
}
