/**
 * Optional BullMQ queue depth for ops readiness (no long-lived connections).
 * Safe when Redis is down: returns `{ available: false }` without throwing to callers.
 */

import { env } from '../config/env.js';

/**
 * One-shot: connect → read job counts → close (avoids leaking Redis clients in the API process).
 * @returns {Promise<
 *   | { available: true; queue: string; counts: Record<string, number> }
 *   | { available: false; reason: string; detail?: string }
 * >}
 */
export async function getPhase1FulfillmentQueueObservation() {
  const url = String(process.env.REDIS_URL ?? env.redisUrl ?? '').trim();
  if (!url) {
    return { available: false, reason: 'redis_url_unset' };
  }

  /** @type {import('ioredis').default | null} */
  let connection = null;
  /** @type {import('bullmq').Queue | null} */
  let queue = null;
  try {
    const { Queue } = await import('bullmq');
    const { createBullmqConnection } = await import('../queues/bullmqRedis.js');
    const { PHASE1_FULFILLMENT_QUEUE_NAME } = await import(
      '../queues/phase1FulfillmentQueueName.js',
    );
    connection = createBullmqConnection();
    queue = new Queue(PHASE1_FULFILLMENT_QUEUE_NAME, { connection });
    const counts = await queue.getJobCounts(
      'waiting',
      'active',
      'delayed',
      'failed',
      'paused',
      'completed',
    );
    return {
      available: true,
      queue: PHASE1_FULFILLMENT_QUEUE_NAME,
      counts,
    };
  } catch (e) {
    return {
      available: false,
      reason: 'queue_probe_failed',
      detail: String(e?.message ?? e).slice(0, 220),
    };
  } finally {
    if (queue) {
      try {
        await queue.close();
      } catch {
        /* best-effort */
      }
    }
    if (connection) {
      try {
        connection.disconnect();
      } catch {
        /* best-effort */
      }
    }
  }
}
