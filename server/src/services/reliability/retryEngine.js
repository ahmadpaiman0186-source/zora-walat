import { isLikelyNetworkError } from './failureModel.js';

/**
 * @typedef {object} RetryAttemptMeta
 * @property {number} attempt — 1-based
 * @property {string | null} traceId
 * @property {unknown} [lastError]
 * @property {unknown} [lastResult]
 */

/**
 * @typedef {object} RetryEngineOptions
 * @property {number} [maxAttempts] default 3
 * @property {number[]} [backoffMs] default [500, 1500, 3000]
 * @property {string | null} [traceId]
 * @property {string} [label] for metrics / logs
 * @property {(result: unknown) => boolean} [shouldRetryResult] — if true, retry after backoff
 * @property {(err: unknown) => boolean} [shouldRetryError] — if true, retry after backoff
 */

const globalRetryStats = {
  totalRetryAttempts: 0,
  byLabel: /** @type {Record<string, number>} */ ({}),
};

export function getRetryEngineStats() {
  return { ...globalRetryStats, byLabel: { ...globalRetryStats.byLabel } };
}

function bumpStats(label) {
  globalRetryStats.totalRetryAttempts += 1;
  const k = label || 'default';
  globalRetryStats.byLabel[k] = (globalRetryStats.byLabel[k] ?? 0) + 1;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Bounded retry with exponential-ish backoff schedule.
 * Deterministic: same inputs + same callee outcomes → same attempt count.
 *
 * @template T
 * @param {() => Promise<T>} fn
 * @param {RetryEngineOptions} options
 * @returns {Promise<{ ok: true, value: T, attempts: number, traceId: string | null, lastError?: unknown } | { ok: false, error: unknown, attempts: number, traceId: string | null, lastError: unknown }>}
 */
export async function withRetry(fn, options = {}) {
  const maxAttempts = options.maxAttempts ?? 3;
  if (maxAttempts < 1) {
    return {
      ok: false,
      error: new Error('retry_invalid_max_attempts'),
      attempts: 0,
      traceId: options.traceId ?? null,
      lastError: undefined,
    };
  }
  const backoffMs = options.backoffMs ?? [500, 1500, 3000];
  const traceId = options.traceId ?? null;
  const label = options.label ?? 'retry';
  const shouldRetryResult = options.shouldRetryResult ?? (() => false);
  const shouldRetryError =
    options.shouldRetryError ??
    ((err) => {
      return isLikelyNetworkError(err);
    });

  /** @type {unknown} */
  let lastError;
  /** @type {unknown} */
  let lastResult;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const value = await fn();
      lastResult = value;
      const retryResult = shouldRetryResult(value, attempt);
      if (!retryResult || attempt === maxAttempts) {
        return { ok: true, value, attempts: attempt, traceId, lastError, lastResult };
      }
      bumpStats(label);
      const delay = backoffMs[Math.min(attempt - 1, backoffMs.length - 1)] ?? 3000;
      await sleep(delay);
    } catch (err) {
      lastError = err;
      const retryErr = shouldRetryError(err, attempt);
      if (!retryErr || attempt === maxAttempts) {
        return { ok: false, error: err, attempts: attempt, traceId, lastError: err };
      }
      bumpStats(label);
      const delay = backoffMs[Math.min(attempt - 1, backoffMs.length - 1)] ?? 3000;
      await sleep(delay);
    }
  }

  return {
    ok: false,
    error: lastError ?? new Error('retry_exhausted'),
    attempts: maxAttempts,
    traceId,
    lastError,
  };
}

