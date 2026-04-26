/**
 * PHASE 1 — FAILURE MODEL (routing policy)
 *
 * | Category   | Examples                          | Default behavior      |
 * |------------|-----------------------------------|------------------------|
 * | NETWORK    | timeouts, DNS, ECONNRESET         | retry → queue_async   |
 * | PROVIDER   | 5xx, rate limits, transient API   | retry → failover      |
 * | BUSINESS   | invalid MSISDN, bad amount        | deny (no retry)       |
 * | INTERNAL   | unexpected exception              | queue_async + trace   |
 * | SLOW       | high latency                      | degrade / watchdog    |
 *
 * Failure taxonomy for the reliability “super system”.
 * Each category maps to a default handling strategy (see {@link FAILURE_BEHAVIOR}).
 */

/** @typedef {'retry' | 'failover' | 'deny' | 'queue_async' | 'degrade'} FailureBehavior */

export const FAILURE_CATEGORY = Object.freeze({
  NETWORK: 'network',
  PROVIDER: 'provider',
  BUSINESS: 'business',
  INTERNAL: 'internal',
  SLOW: 'slow',
});

/**
 * Canonical string taxonomy (API / logs / orchestrator) — maps to {@link FAILURE_CATEGORY} + behaviors.
 */
export const FAILURE_CATEGORY_EXPLICIT = Object.freeze({
  NETWORK_FAILURE: 'network_failure',
  PROVIDER_FAILURE: 'provider_failure',
  BUSINESS_FAILURE: 'business_failure',
  INTERNAL_FAILURE: 'internal_failure',
  DEGRADED_PERFORMANCE: 'degraded_performance',
});

/** Alias for policy maps (same values as FAILURE_BEHAVIOR). */
export const RELIABILITY_BEHAVIOR = Object.freeze({
  RETRY: 'retry',
  FAILOVER: 'failover',
  DENY: 'deny',
  QUEUE_ASYNC: 'queue_async',
  NO_RETRY_TERMINAL: 'no_retry_terminal',
  DEGRADE: 'degrade',
});

export const FAILURE_BEHAVIOR = Object.freeze({
  RETRY: 'retry',
  FAILOVER: 'failover',
  DENY: 'deny',
  QUEUE_ASYNC: 'queue_async',
  DEGRADE: 'degrade',
});

/**
 * Default routing policy per category (deterministic baseline).
 * @type {Record<string, FailureBehavior>}
 */
export const DEFAULT_CATEGORY_BEHAVIOR = Object.freeze({
  [FAILURE_CATEGORY.NETWORK]: FAILURE_BEHAVIOR.RETRY,
  [FAILURE_CATEGORY.PROVIDER]: FAILURE_BEHAVIOR.RETRY,
  [FAILURE_CATEGORY.BUSINESS]: FAILURE_BEHAVIOR.DENY,
  [FAILURE_CATEGORY.INTERNAL]: FAILURE_BEHAVIOR.QUEUE_ASYNC,
  [FAILURE_CATEGORY.SLOW]: FAILURE_BEHAVIOR.DEGRADE,
});

/**
 * Explicit category → ordered handling chain (first applicable wins at orchestration sites).
 * @type {Record<string, ReliabilityBehavior[]>}
 */
export const EXPLICIT_CATEGORY_BEHAVIOR_CHAIN = Object.freeze({
  [FAILURE_CATEGORY_EXPLICIT.NETWORK_FAILURE]: [
    RELIABILITY_BEHAVIOR.RETRY,
    RELIABILITY_BEHAVIOR.QUEUE_ASYNC,
  ],
  [FAILURE_CATEGORY_EXPLICIT.PROVIDER_FAILURE]: [
    RELIABILITY_BEHAVIOR.RETRY,
    RELIABILITY_BEHAVIOR.FAILOVER,
    RELIABILITY_BEHAVIOR.QUEUE_ASYNC,
  ],
  [FAILURE_CATEGORY_EXPLICIT.BUSINESS_FAILURE]: [RELIABILITY_BEHAVIOR.NO_RETRY_TERMINAL],
  [FAILURE_CATEGORY_EXPLICIT.INTERNAL_FAILURE]: [
    RELIABILITY_BEHAVIOR.QUEUE_ASYNC,
    RELIABILITY_BEHAVIOR.NO_RETRY_TERMINAL,
  ],
  [FAILURE_CATEGORY_EXPLICIT.DEGRADED_PERFORMANCE]: [RELIABILITY_BEHAVIOR.DEGRADE],
});

/** @typedef {typeof RELIABILITY_BEHAVIOR[keyof typeof RELIABILITY_BEHAVIOR]} ReliabilityBehavior */

const NETWORK_ERRNO = new Set(['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN']);

/**
 * Best-effort classification for logs / orchestrator decisions (not a substitute for domain validation).
 * @param {unknown} err
 * @returns {typeof FAILURE_CATEGORY_EXPLICIT[keyof typeof FAILURE_CATEGORY_EXPLICIT]}
 */
export function classifyErrorToExplicitCategory(err) {
  if (isLikelyNetworkError(err)) {
    return FAILURE_CATEGORY_EXPLICIT.NETWORK_FAILURE;
  }
  if (err && typeof err === 'object') {
    const t = /** @type {{ type?: string, statusCode?: number, code?: string }} */ (err).type;
    if (typeof t === 'string' && t.startsWith('Stripe')) {
      const sc = /** @type {{ statusCode?: number }} */ (err).statusCode;
      if (typeof sc === 'number' && sc >= 400 && sc < 500) {
        return FAILURE_CATEGORY_EXPLICIT.BUSINESS_FAILURE;
      }
      return FAILURE_CATEGORY_EXPLICIT.PROVIDER_FAILURE;
    }
  }
  return FAILURE_CATEGORY_EXPLICIT.INTERNAL_FAILURE;
}

/**
 * @param {unknown} err
 * @returns {boolean}
 */
export function isLikelyNetworkError(err) {
  if (!err || typeof err !== 'object') return false;
  const c = /** @type {{ code?: string }} */ (err).code;
  if (typeof c === 'string' && NETWORK_ERRNO.has(c)) return true;
  const msg = String(/** @type {{ message?: string }} */ (err).message ?? err).toLowerCase();
  return (
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('econnreset') ||
    msg.includes('socket') ||
    msg.includes('network')
  );
}

/**
 * Safe to retry a normalized top-up result (never retry logical 4xx / business).
 * @param {{ outcome?: string, errorCode?: string }} result
 * @returns {boolean}
 */
export function isSafeToRetryTopupResult(result) {
  if (!result || result.outcome !== 'failed_retryable') return false;
  const code = String(result.errorCode ?? '');
  /** Never retry business-shape outcomes that still surface as failed_retryable in edge cases */
  if (code === 'INVALID_PRODUCT' || code === 'AMOUNT_MISMATCH') return false;
  /**
   * Transient / transport-class codes (Reloadly + executor).
   * @type {Set<string>}
   */
  const allow = new Set([
    'provider_unavailable',
    'provider_circuit_open',
    'auth_failure_retry',
    'reloadly_malformed_provider_result',
    'PROVIDER_EXCEPTION',
  ]);
  if (allow.has(code)) return true;
  if (code.startsWith('reloadly_topup_server')) return true;
  return false;
}

/**
 * @param {{ outcome?: string }} result
 * @returns {boolean}
 */
export function isBusinessOrLogicalDeny(result) {
  if (!result) return true;
  if (
    result.outcome === 'invalid_request' ||
    result.outcome === 'unsupported_route' ||
    result.outcome === 'failed_terminal'
  ) {
    return true;
  }
  return false;
}
