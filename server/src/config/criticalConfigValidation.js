import { env } from './env.js';
import { isFulfillmentQueueEnabled } from '../queues/queueEnabled.js';

/**
 * Non-exiting checklist for scripts (`scripts/gate-check.mjs`) and tests.
 * @returns {string[]}
 */
export function collectCriticalLaunchConfigViolations() {
  if (process.env.NODE_ENV === 'test') return [];

  const nodeEnv = String(env.nodeEnv ?? process.env.NODE_ENV ?? '').trim();
  const redisUrl = String(process.env.REDIS_URL ?? env.redisUrl ?? '').trim();
  const fq = process.env.FULFILLMENT_QUEUE_ENABLED === 'true';
  /** @type {string[]} */
  const v = [];

  if (nodeEnv === 'production' && fq && !redisUrl) {
    v.push(
      'FULFILLMENT_QUEUE_ENABLED=true requires REDIS_URL in production (BullMQ + DLQ + metrics aggregation).',
    );
  }

  if (
    nodeEnv === 'production' &&
    env.metricsPrometheusEnabled &&
    !env.metricsRedisAggregation &&
    fq
  ) {
    v.push(
      'In production with fulfillment queue + METRICS_PROMETHEUS_ENABLED, set METRICS_REDIS_AGGREGATION=true so /metrics reflects cluster totals (not a single replica).',
    );
  }

  if (nodeEnv === 'production' && fq && !isFulfillmentQueueEnabled()) {
    v.push('FULFILLMENT_QUEUE_ENABLED=true but queue is not fully active (REDIS_URL missing?).');
  }

  return v;
}

/**
 * Fail-fast checks for distributed / money-path correctness. Fatal in production where noted.
 */
export function assertCriticalLaunchConfigOrExit() {
  if (process.env.NODE_ENV === 'test') return;

  const v = collectCriticalLaunchConfigViolations();
  for (const msg of v) {
    console.error('[fatal]', msg);
  }
  if (v.length) {
    process.exit(1);
  }
}
