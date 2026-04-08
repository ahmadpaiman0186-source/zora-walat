/**
 * Multi-instance–friendly counters + histograms in Redis (shared across API/worker replicas).
 * Uses node-redis via `withRedis` (same as checkout-side Redis; configure REDIS_URL).
 * Writes are best-effort (fire-and-forget on hot paths); scrape merges into Prometheus text.
 */
import { env } from '../config/env.js';
import { withRedis } from '../services/redisClient.js';
import {
  DEFAULT_LATENCY_BUCKET_MS,
  legacyCounterField,
  labeledCounterField,
  histogramBucketField,
  histogramSumCountField,
} from './metricsConvention.js';

export const REDIS_METRICS_COUNTERS_KEY = 'zora:metrics:v2:counters';

/**
 * @param {string} field from metricsConvention helpers
 * @param {number} delta
 */
export function scheduleRedisMetricIncr(field, delta = 1) {
  if (!env.metricsRedisAggregation) return;
  if (!Number.isFinite(delta) || delta === 0) return;
  const f = String(field);
  queueMicrotask(() => {
    void flushMetricIncr(f, Math.round(delta));
  });
}

async function flushMetricIncr(field, delta) {
  const r = await withRedis((c) => c.hIncrBy(REDIS_METRICS_COUNTERS_KEY, field, delta));
  if (!r.ok) {
    // Single-line diagnostic; do not throw — money path must not depend on metrics.
    if (env.nodeEnv !== 'test') {
      console.warn(
        JSON.stringify({
          metricsRedis: true,
          event: 'redis_metric_incr_failed',
          error: r.error,
          t: new Date().toISOString(),
        }),
      );
    }
  }
}

/** Legacy flat counter name → shared aggregate. */
export function scheduleLegacyCounterIncr(name, delta = 1) {
  scheduleRedisMetricIncr(legacyCounterField(name), delta);
}

/**
 * @param {string} metricBase
 * @param {Record<string, string>} labels
 * @param {number} delta
 */
export function scheduleLabeledCounterIncr(metricBase, labels, delta = 1) {
  scheduleRedisMetricIncr(labeledCounterField(metricBase, labels), delta);
}

/**
 * Observes latency (ms): cumulative histogram buckets + sum/count.
 * @param {string} metricBase e.g. zora_http_request_duration_milliseconds
 * @param {Record<string, string>} labels include route, method if desired
 * @param {number} valueMs
 * @param {readonly number[]} [buckets]
 */
export function scheduleHistogramObserve(
  metricBase,
  labels,
  valueMs,
  buckets = DEFAULT_LATENCY_BUCKET_MS,
) {
  if (!env.metricsRedisAggregation) return;
  const v = Number(valueMs);
  if (!Number.isFinite(v) || v < 0) return;
  const bounds = [...buckets, Number.POSITIVE_INFINITY];
  queueMicrotask(async () => {
    for (const b of bounds) {
      if (v <= b) {
        await flushMetricIncr(histogramBucketField(metricBase, labels, b), 1);
      }
    }
    await flushMetricIncr(histogramSumCountField(metricBase, labels, 'sum'), Math.round(v));
    await flushMetricIncr(histogramSumCountField(metricBase, labels, 'count'), 1);
  });
}

/**
 * @returns {Promise<Record<string, string>>}
 */
export async function fetchRedisMetricsHash() {
  const r = await withRedis((c) => c.hGetAll(REDIS_METRICS_COUNTERS_KEY));
  if (!r.ok) return {};
  return /** @type {Record<string, string>} */ (r.value ?? {});
}
