import { Worker, UnrecoverableError } from 'bullmq';

import { env } from '../config/env.js';
import { createBullmqConnection } from './bullmqRedis.js';
import { isFulfillmentQueueEnabled } from './queueEnabled.js';
import { PHASE1_FULFILLMENT_QUEUE_NAME } from './phase1FulfillmentQueueName.js';
import { resolvePhase1FulfillmentWorkerConcurrency } from './phase1FulfillmentWorkerConcurrency.js';
import { processFulfillmentForOrder } from '../services/fulfillmentProcessingService.js';
import { classifyTransactionFailure } from '../constants/transactionFailureClass.js';
import { isTransientTransactionFailureClass } from '../constants/transactionFailureClass.js';
import { formatPhase1FulfillmentFailedJobFingerprint } from './phase1FulfillmentReplayDiscipline.js';
import {
  classifyFailureIntelligence,
  recordFailureIntelligenceMetric,
} from '../lib/failureIntelligence.js';
import { recordPhase1FulfillmentDlqEntry } from '../services/phase1FulfillmentDlqService.js';
import {
  closePhase1FulfillmentDeadLetterQueue,
  enqueuePhase1FulfillmentDeadLetterJob,
} from './phase1FulfillmentDeadLetterQueue.js';
/** @type {import('bullmq').Worker | null} */
let workerSingleton = null;
/** @type {import('ioredis').default | null} */
let workerConnectionSingleton = null;

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
      const orderId = job.data?.orderId;
      const traceId = job.data?.traceId ?? null;
      if (!orderId || typeof orderId !== 'string') {
        throw new UnrecoverableError('invalid_job_payload_missing_orderId');
      }
      try {
        await processFulfillmentForOrder(orderId, {
          traceId,
          bullmqAttemptsMade: job.attemptsMade ?? 0,
        });
      } catch (err) {
        const failureClass = classifyTransactionFailure(err, {
          surface: 'fulfillment_worker',
        });
        if (isTransientTransactionFailureClass(failureClass)) {
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
