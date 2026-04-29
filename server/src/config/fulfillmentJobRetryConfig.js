/**
 * BullMQ Phase 1 fulfillment job retry schedule (milliseconds between attempts).
 * Default: 5s, 30s, 2m — three retries after the first run (pair with `FULFILLMENT_JOB_MAX_ATTEMPTS=4`).
 * Override: `FULFILLMENT_JOB_RETRY_DELAYS_MS=5000,30000,120000`
 */

export const DEFAULT_FULFILLMENT_JOB_RETRY_DELAYS_MS = Object.freeze([
  5000, 30_000, 120_000,
]);

/**
 * @param {string | undefined} raw
 * @returns {readonly number[]}
 */
export function parseFulfillmentJobRetryDelaysMsFromEnv(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return DEFAULT_FULFILLMENT_JOB_RETRY_DELAYS_MS;
  const parts = s
    .split(',')
    .map((x) => parseInt(x.trim(), 10))
    .filter((n) => Number.isFinite(n) && n >= 200);
  return Object.freeze(parts.length ? parts : [...DEFAULT_FULFILLMENT_JOB_RETRY_DELAYS_MS]);
}
