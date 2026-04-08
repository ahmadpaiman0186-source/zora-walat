/**
 * Prometheus / OpenTelemetry–aligned naming for Zora-Walat (see also `redisMetricsAggregator.js`).
 *
 * Conventions:
 * - Prefix: `zora_`
 * - Suffix `_total` for counters, `_milliseconds` / `_seconds` for durations (explicit unit)
 * - Labels: lowercase snake_case keys; values sanitized (no quotes/newlines)
 * - Histogram bucket label `le` uses numeric ms for latency here (exposition converts if needed)
 */

export const METRICS_NAMESPACE = 'zora';

/** Cumulative latency buckets (ms) for HTTP-style histograms; observation increments every bucket where value <= bound. */
export const DEFAULT_LATENCY_BUCKET_MS = Object.freeze([
  5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 30000,
]);

/**
 * @param {Record<string, string>} labels
 * @returns {string} stable key fragment for Redis / dedupe
 */
export function formatSortedLabels(labels) {
  const keys = Object.keys(labels).sort();
  return keys.map((k) => `${k}=${sanitizeLabelValue(labels[k])}`).join(',');
}

function sanitizeLabelValue(v) {
  return String(v ?? '')
    .replace(/[\r\n"|\\]/g, '_')
    .slice(0, 128);
}

/**
 * @param {string} metricBase e.g. zora_http_request_duration_milliseconds
 * @param {Record<string, string>} labels
 */
export function legacyCounterField(name) {
  return `c|${String(name).replace(/\|/g, '_')}`;
}

/**
 * @param {string} metricBase
 * @param {Record<string, string>} labels
 */
export function labeledCounterField(metricBase, labels) {
  const lb = formatSortedLabels(labels);
  const base = String(metricBase).replace(/\|/g, '_');
  return lb ? `lc|${base}|${lb}` : `lc|${base}`;
}

/**
 * @param {string} metricBase
 * @param {Record<string, string>} labels
 * @param {number} upperBoundMs
 */
export function histogramBucketField(metricBase, labels, upperBoundMs) {
  const lb = formatSortedLabels(labels);
  const b = upperBoundMs === Number.POSITIVE_INFINITY ? 'inf' : String(Math.round(upperBoundMs));
  return `hb|${String(metricBase).replace(/\|/g, '_')}|${lb}|le=${b}`;
}

export function histogramSumCountField(metricBase, labels, kind) {
  const lb = formatSortedLabels(labels);
  return `hs|${String(metricBase).replace(/\|/g, '_')}|${lb}|${kind === 'sum' ? 'sum' : 'count'}`;
}
