/**
 * Prometheus exposition: process-local only, or Redis-aggregated when METRICS_REDIS_AGGREGATION=true.
 */
import { getOpsMetricsSnapshot } from './opsMetrics.js';
import {
  buildPrometheusMetricsPayload,
  renderLocalCountersAndWindows,
} from './prometheusAggregateRenderer.js';

/**
 * @returns {Promise<string>}
 */
export async function renderPrometheusTextFromOps() {
  return buildPrometheusMetricsPayload(getOpsMetricsSnapshot);
}

/** Sync path for tests / tooling. */
export function renderPrometheusTextLocalOnly() {
  const snap = getOpsMetricsSnapshot();
  return renderLocalCountersAndWindows(snap.counters, snap.windows);
}
