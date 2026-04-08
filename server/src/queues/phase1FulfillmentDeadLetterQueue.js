/**
 * BullMQ dead-letter queue for Phase 1 fulfillment jobs that exhaust retries on the primary queue.
 * Complements Redis-list DLQ (`phase1FulfillmentDlqService`); worker enqueues here on final failure.
 */
import { Queue } from 'bullmq';

import { env } from '../config/env.js';
import { createBullmqConnection } from './bullmqRedis.js';
import { isFulfillmentQueueEnabled } from './queueEnabled.js';
/** BullMQ queue holding jobs that exhausted retries on the primary fulfillment queue. */
export const PHASE1_FULFILLMENT_DLQ_QUEUE_NAME = 'phase1-fulfillment-dlq-v1';

/** @type {import('bullmq').Queue | null} */
let dlqSingleton = null;
/** @type {import('ioredis').default | null} */
let dlqConnectionSingleton = null;

/**
 * @returns {import('bullmq').Queue | null}
 */
export function getPhase1FulfillmentDeadLetterQueue() {
  const url = String(env.redisUrl ?? '').trim();
  if (!url || !isFulfillmentQueueEnabled()) return null;
  if (dlqSingleton) return dlqSingleton;
  try {
    dlqConnectionSingleton = createBullmqConnection();
    dlqSingleton = new Queue(PHASE1_FULFILLMENT_DLQ_QUEUE_NAME, {
      connection: dlqConnectionSingleton,
      defaultJobOptions: {
        removeOnComplete: { count: 10_000 },
        removeOnFail: false,
        attempts: 1,
      },
    });
    return dlqSingleton;
  } catch (e) {
    console.error('[fulfillment-dlq] Queue init failed', e);
    dlqConnectionSingleton = null;
    dlqSingleton = null;
    return null;
  }
}

/**
 * Move a failed primary-queue job snapshot for operator replay / inspection (BullMQ DLQ).
 * @param {object} payload
 */
export async function enqueuePhase1FulfillmentDeadLetterJob(payload) {
  const q = getPhase1FulfillmentDeadLetterQueue();
  if (!q) return { ok: false, reason: 'dlq_unavailable' };
  try {
    const job = await q.add('exhausted_retries', payload, {
      removeOnFail: false,
    });
    return { ok: true, jobId: job.id };
  } catch (e) {
    return {
      ok: false,
      reason: String(e?.message ?? e).slice(0, 200),
    };
  }
}

export async function closePhase1FulfillmentDeadLetterQueue() {
  if (dlqSingleton) {
    await dlqSingleton.close();
    dlqSingleton = null;
  }
  if (dlqConnectionSingleton) {
    dlqConnectionSingleton.disconnect();
    dlqConnectionSingleton = null;
  }
}
