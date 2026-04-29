import { Queue } from 'bullmq';

import { env } from '../config/env.js';
import { createBullmqConnection } from './bullmqRedis.js';
import { PHASE1_FULFILLMENT_QUEUE_NAME } from './phase1FulfillmentQueueName.js';
import { isFulfillmentQueueEnabled } from './queueEnabled.js';

/** @type {import('bullmq').Queue | null} */
let queueSingleton = null;
/** @type {import('ioredis').default | null} */
let connectionSingleton = null;

function canUseQueue() {
  return isFulfillmentQueueEnabled();
}

/**
 * Lazily constructed queue (API process: producer only; worker process: consumer).
 * @returns {import('bullmq').Queue | null}
 */
export function getPhase1FulfillmentQueue() {
  if (!canUseQueue()) return null;
  if (queueSingleton) return queueSingleton;
  try {
    connectionSingleton = createBullmqConnection();
    queueSingleton = new Queue(PHASE1_FULFILLMENT_QUEUE_NAME, {
      connection: connectionSingleton,
      defaultJobOptions: {
        attempts: Math.max(1, env.fulfillmentJobMaxAttempts),
        backoff: {
          type: 'custom',
        },
        removeOnComplete: { count: 25_000 },
        removeOnFail: false,
      },
    });
    return queueSingleton;
  } catch (e) {
    console.error('[fulfillment-queue] Queue init failed', e);
    connectionSingleton = null;
    queueSingleton = null;
    return null;
  }
}

/**
 * Close producer connection (tests / graceful shutdown).
 */
export async function closePhase1FulfillmentQueue() {
  if (queueSingleton) {
    await queueSingleton.close();
    queueSingleton = null;
  }
  if (connectionSingleton) {
    connectionSingleton.disconnect();
    connectionSingleton = null;
  }
}
