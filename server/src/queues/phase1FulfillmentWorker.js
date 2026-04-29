import { Worker, UnrecoverableError } from 'bullmq';

import { parsePhase1FulfillmentJobPayload } from '../infrastructure/fulfillment/fulfillmentJobContract.js';
import { emitMoneyPathLog } from '../infrastructure/logging/moneyPathLog.js';
import { MONEY_PATH_EVENT } from '../domain/payments/moneyPathEvents.js';
import { env } from '../config/env.js';
import { createBullmqConnection } from './bullmqRedis.js';
import { isFulfillmentQueueEnabled } from './queueEnabled.js';
import { PHASE1_FULFILLMENT_QUEUE_NAME } from './phase1FulfillmentQueueName.js';
import { resolvePhase1FulfillmentWorkerConcurrency } from './phase1FulfillmentWorkerConcurrency.js';
import { processFulfillmentForOrder } from '../services/fulfillmentProcessingService.js';
import {
  emitPhase1FulfillmentAttempted,
  emitPhase1FulfillmentFailed,
  emitPhase1FulfillmentSucceeded,
} from '../infrastructure/logging/phase1Observability.js';
import { resolveAirtimeProviderName } from '../domain/fulfillment/executeAirtimeFulfillment.js';
import { classifyTransactionFailure } from '../constants/transactionFailureClass.js';
import { isTransientTransactionFailureClass } from '../constants/transactionFailureClass.js';
import { formatPhase1FulfillmentFailedJobFingerprint } from './phase1FulfillmentReplayDiscipline.js';
import {
  classifyFailureIntelligence,
  recordFailureIntelligenceMetric,
} from '../lib/failureIntelligence.js';
import { recordReliabilityDecision } from '../services/reliability/watchdog.js';
import { recordPhase1FulfillmentDlqEntry } from '../services/phase1FulfillmentDlqService.js';
import {
  closePhase1FulfillmentDeadLetterQueue,
  enqueuePhase1FulfillmentDeadLetterJob,
} from './phase1FulfillmentDeadLetterQueue.js';
/** @type {import('bullmq').Worker | null} */
let workerSingleton = null;
/** @type {import('ioredis').default | null} */
let workerConnectionSingleton = null;

/**
 * BullMQ `backoff: { type: 'custom' }` delays between attempts (after attempt 1 fails → delay[0], …).
 * @param {number} attemptsMade
 * @param {string | undefined} type
 * @returns {number}
 */
function phase1FulfillmentBackoffMs(attemptsMade, type) {
  const delays = env.fulfillmentJobRetryDelaysMs;
  const t = String(type ?? '');
  if (t === 'custom' || t === '') {
    const idx = Math.min(
      Math.max(attemptsMade - 1, 0),
      Math.max(0, delays.length - 1),
    );
    return delays[idx] ?? 5000;
  }
  if (t === 'exponential') {
    const base = Math.max(200, env.fulfillmentJobBackoffMs);
    return 2 ** Math.max(attemptsMade - 1, 0) * base;
  }
  if (t === 'fixed') {
    return Math.max(200, env.fulfillmentJobBackoffMs);
  }
  return Math.max(200, env.fulfillmentJobBackoffMs);
}

function logWorkerStructured(payload) {
  console.log(
    JSON.stringify({
      fulfillmentWorker: true,
      queue: PHASE1_FULFILLMENT_QUEUE_NAME,
      t: new Date().toISOString(),
      ...payload,
    }),
  );
}

/**
 * Starts a BullMQ worker (dedicated process). Uses a **separate** Redis connection from the producer.
 */
export function startPhase1FulfillmentWorker() {
  if (workerSingleton) return workerSingleton;
  const url = String(env.redisUrl ?? '').trim();
  if (!url || !isFulfillmentQueueEnabled()) {
    logWorkerStructured({
      event: 'worker_skip',
      reason: !url ? 'redis_url_missing' : 'fulfillment_queue_disabled',
    });
    return null;
  }
  try {
    workerConnectionSingleton = createBullmqConnection();
  } catch (e) {
    logWorkerStructured({
      event: 'worker_skip',
      reason: 'redis_connection_failed',
      message: String(e?.message ?? e).slice(0, 200),
    });
    return null;
  }
  const workerConcurrency = resolvePhase1FulfillmentWorkerConcurrency();
  workerSingleton = new Worker(
    PHASE1_FULFILLMENT_QUEUE_NAME,
    async (job) => {
      const parsed = parsePhase1FulfillmentJobPayload(job.data);
      if (!parsed.ok) {
        throw new UnrecoverableError(`invalid_job_payload:${parsed.reason}`);
      }
      const { orderId, traceId, idempotencyKey } = parsed.payload;
      emitMoneyPathLog(MONEY_PATH_EVENT.FULFILLMENT_DISPATCH_START, {
        traceId,
        idempotencyKeySuffix: String(idempotencyKey).slice(-12),
        orderIdSuffix: orderId.slice(-12),
        bullmqJobId: job.id != null ? String(job.id) : null,
        attempt: job.attemptsMade ?? 0,
      });
      emitPhase1FulfillmentAttempted(
        { id: orderId },
        {
          provider: resolveAirtimeProviderName(),
          traceId,
          bullmqJobId: job.id != null ? String(job.id) : null,
        },
      );
      try {
        await processFulfillmentForOrder(orderId, {
          traceId,
          bullmqAttemptsMade: job.attemptsMade ?? 0,
        });
        emitMoneyPathLog(MONEY_PATH_EVENT.FULFILLMENT_SUCCESS, {
          traceId,
          orderIdSuffix: orderId.slice(-12),
          bullmqJobId: job.id != null ? String(job.id) : null,
        });
        emitPhase1FulfillmentSucceeded(
          { id: orderId },
          {
            provider: resolveAirtimeProviderName(),
            traceId,
            bullmqJobId: job.id != null ? String(job.id) : null,
          },
        );
      } catch (err) {
        emitMoneyPathLog(MONEY_PATH_EVENT.FULFILLMENT_FAILURE, {
          traceId,
          orderIdSuffix: orderId.slice(-12),
          message: String(err?.message ?? err).slice(0, 200),
        });
        emitPhase1FulfillmentFailed(
          { id: orderId },
          {
            provider: resolveAirtimeProviderName(),
            errorCode: 'worker_exception',
            traceId,
            bullmqJobId: job.id != null ? String(job.id) : null,
          },
        );
        const failureClass = classifyTransactionFailure(err, {
          surface: 'fulfillment_worker',
        });
        if (isTransientTransactionFailureClass(failureClass)) {
          recordReliabilityDecision({
            layer: 'phase1_fulfillment_worker',
            traceId,
            outcome: 'queue_async_retry',
            orderIdSuffix: orderId.slice(-12),
            failureClass,
            attempt: job.attemptsMade + 1,
          });
          logWorkerStructured({
            event: 'job_retry_transient',
            jobId: job.id,
            orderIdSuffix: orderId.slice(-12),
            failureClass,
            attempt: job.attemptsMade + 1,
            message: String(err?.message ?? err).slice(0, 200),
          });
          throw err;
        }
        logWorkerStructured({
          event: 'job_failed_unrecoverable',
          jobId: job.id,
          orderIdSuffix: orderId.slice(-12),
          failureClass,
          message: String(err?.message ?? err).slice(0, 200),
        });
        throw new UnrecoverableError(
          `${failureClass}:${String(err?.message ?? err).slice(0, 180)}`,
        );
      }
    },
    {
      connection: workerConnectionSingleton,
      concurrency: workerConcurrency,
      lockDuration: 60_000,
      stalledInterval: 30_000,
      settings: {
        backoffStrategy: (attemptsMade, type) =>
          phase1FulfillmentBackoffMs(attemptsMade, type),
      },
    },
  );
  workerSingleton.on('failed', (job, err) => {
    const maxAttempts = job?.opts?.attempts ?? 1;
    const attemptsMade = job?.attemptsMade ?? 0;
    const finalAttempt = job != null && attemptsMade >= maxAttempts;
    const { intelligenceClass, transactionClass } = classifyFailureIntelligence({
      error: err,
      surface: 'fulfillment_worker',
      exhaustedRetries: finalAttempt,
    });
    recordFailureIntelligenceMetric(intelligenceClass, transactionClass, {
      queue: PHASE1_FULFILLMENT_QUEUE_NAME,
      surface: 'fulfillment_worker',
    });
    const oid =
      job?.data?.orderId != null ? String(job.data.orderId).trim() : '';
    if (finalAttempt && oid) {
      void recordPhase1FulfillmentDlqEntry({
        orderId: oid,
        jobId: job?.id != null ? String(job.id) : null,
        traceId: job?.data?.traceId ?? null,
        attemptsMade,
        maxAttempts,
        errorDigest: String(err?.message ?? err).slice(0, 400),
        failureClass: transactionClass,
        intelligenceClass,
        event: 'bullmq_failed_final',
      });
      void enqueuePhase1FulfillmentDeadLetterJob({
        v: 1,
        t: new Date().toISOString(),
        sourceQueue: PHASE1_FULFILLMENT_QUEUE_NAME,
        orderId: oid,
        traceId: job?.data?.traceId ?? null,
        originalJobId: job?.id != null ? String(job.id) : null,
        attemptsMade,
        maxAttempts,
        error: String(err?.message ?? err).slice(0, 500),
        failureClass: transactionClass,
        intelligenceClass,
      });
    }
    logWorkerStructured({
      event: 'bullmq_failed_event',
      intelligenceClass,
      transactionClass,
      ...formatPhase1FulfillmentFailedJobFingerprint({
        jobId: job?.id,
        orderId: job?.data?.orderId,
        attemptsMade,
        maxAttempts,
        traceId: job?.data?.traceId,
        finalAttempt,
      }),
      error: String(err?.message ?? err).slice(0, 240),
    });
  });
  workerSingleton.on('stalled', (jobId) => {
    logWorkerStructured({
      event: 'bullmq_stalled_job',
      jobId: jobId != null ? String(jobId) : null,
    });
  });
  workerSingleton.on('completed', (job) => {
    logWorkerStructured({
      event: 'bullmq_completed_event',
      jobId: job.id,
      orderIdSuffix: job.data?.orderId
        ? String(job.data.orderId).slice(-12)
        : null,
      attempts: job.attemptsMade,
    });
  });
  logWorkerStructured({
    event: 'worker_started',
    concurrency: workerConcurrency,
  });
  return workerSingleton;
}

export async function stopPhase1FulfillmentWorker() {
  if (workerSingleton) {
    await workerSingleton.close();
    workerSingleton = null;
  }
  if (workerConnectionSingleton) {
    workerConnectionSingleton.disconnect();
    workerConnectionSingleton = null;
  }
  await closePhase1FulfillmentDeadLetterQueue();
}
