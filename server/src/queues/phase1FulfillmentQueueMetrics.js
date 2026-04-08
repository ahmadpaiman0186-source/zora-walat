import { QueueEvents } from 'bullmq';

import { getPhase1FulfillmentQueue } from './phase1FulfillmentQueue.js';
import { PHASE1_FULFILLMENT_QUEUE_NAME } from './phase1FulfillmentQueueName.js';
import { isFulfillmentQueueEnabled } from './queueEnabled.js';
import { createBullmqConnection } from './bullmqRedis.js';
import { resolvePhase1FulfillmentWorkerConcurrency } from './phase1FulfillmentWorkerConcurrency.js';

/** @type {import('bullmq').QueueEvents | null} */
let metricsEventsSingleton = null;
/** @type {import('ioredis').default | null} */
let metricsEventsConnection = null;

async function ensureMetricsQueueEventsReady() {
  if (metricsEventsSingleton) return true;
  if (!isFulfillmentQueueEnabled()) return false;
  try {
    metricsEventsConnection = createBullmqConnection();
    metricsEventsSingleton = new QueueEvents(PHASE1_FULFILLMENT_QUEUE_NAME, {
      connection: metricsEventsConnection,
    });
    await Promise.race([
      metricsEventsSingleton.waitUntilReady(),
      new Promise((_, rej) =>
        setTimeout(() => rej(new Error('queue_events_ready_timeout')), 5000),
      ),
    ]);
    return true;
  } catch (e) {
    console.error('[fulfillment-queue-metrics] QueueEvents init failed', e);
    if (metricsEventsSingleton) {
      try {
        await metricsEventsSingleton.close();
      } catch {
        /* ignore */
      }
      metricsEventsSingleton = null;
    }
    if (metricsEventsConnection) {
      metricsEventsConnection.disconnect();
      metricsEventsConnection = null;
    }
    return false;
  }
}

/**
 * Ops snapshot for BullMQ Phase 1 fulfillment queue (OSS BullMQ — no distributed worker registry).
 * Uses Queue job counts + QueueEvents readiness (shared connection path with workers).
 * @returns {Promise<Record<string, unknown>>}
 */
export async function getPhase1FulfillmentQueueMetrics() {
  if (!isFulfillmentQueueEnabled()) {
    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      paused: 0,
      oldestQueuedAgeMs: null,
      oldestProcessingAgeMs: null,
      queueEnabled: false,
      queueName: PHASE1_FULFILLMENT_QUEUE_NAME,
      queueEventsReady: false,
      reason: 'fulfillment_queue_disabled_or_redis_missing',
    };
  }
  const q = getPhase1FulfillmentQueue();
  if (!q) {
    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      paused: 0,
      oldestQueuedAgeMs: null,
      oldestProcessingAgeMs: null,
      queueEnabled: true,
      queueName: PHASE1_FULFILLMENT_QUEUE_NAME,
      queueEventsReady: false,
      reason: 'queue_singleton_unavailable',
    };
  }
  const eventsOk = await ensureMetricsQueueEventsReady();
  try {
    const counts = await q.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
      'paused',
    );
    /** @type {number | null} */
    let oldestQueuedAgeMs = null;
    /** @type {number | null} */
    let oldestActiveAgeMs = null;
    try {
      const waiting = await q.getWaiting(0, 0);
      const w0 = waiting[0];
      if (w0?.timestamp) {
        oldestQueuedAgeMs = Math.max(0, Date.now() - w0.timestamp);
      }
    } catch {
      oldestQueuedAgeMs = null;
    }
    try {
      const active = await q.getActive(0, 0);
      const a0 = active[0];
      if (a0?.timestamp) {
        oldestActiveAgeMs = Math.max(0, Date.now() - a0.timestamp);
      }
    } catch {
      oldestActiveAgeMs = null;
    }
    return {
      waiting: counts.waiting,
      active: counts.active,
      completed: counts.completed,
      failed: counts.failed,
      delayed: counts.delayed,
      paused: counts.paused,
      oldestQueuedAgeMs,
      oldestProcessingAgeMs: oldestActiveAgeMs,
      queueEnabled: true,
      queueName: PHASE1_FULFILLMENT_QUEUE_NAME,
      queueEventsReady: eventsOk,
      configuredWorkerConcurrency: resolvePhase1FulfillmentWorkerConcurrency(),
      queuedJobs: counts.waiting + counts.delayed,
      waitingJobs: counts.waiting,
      delayedJobs: counts.delayed,
      activeJobs: counts.active,
      completedJobs: counts.completed,
      failedJobs: counts.failed,
    };
  } catch (e) {
    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      paused: 0,
      oldestQueuedAgeMs: null,
      oldestProcessingAgeMs: null,
      queueEnabled: true,
      queueName: PHASE1_FULFILLMENT_QUEUE_NAME,
      queueEventsReady: eventsOk,
      error: String(e?.message ?? e).slice(0, 240),
    };
  }
}
