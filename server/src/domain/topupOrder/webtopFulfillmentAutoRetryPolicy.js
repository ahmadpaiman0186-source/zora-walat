/**
 * Automatic webtopup fulfillment retries (DB-driven; worker re-dispatches).
 */
import { env } from '../../config/env.js';
import { FINANCIAL_GUARDRAIL_CODES, FULFILLMENT_DB_ERROR } from './fulfillmentErrors.js';

/** @type {ReadonlySet<string>} */
const PERSISTED_NON_RETRYABLE = new Set([
  FULFILLMENT_DB_ERROR.TERMINAL,
  FULFILLMENT_DB_ERROR.UNSUPPORTED_ROUTE,
  FULFILLMENT_DB_ERROR.INVALID_PRODUCT,
  FULFILLMENT_DB_ERROR.AMOUNT_MISMATCH,
  FULFILLMENT_DB_ERROR.PROVIDER_VERIFYING,
  'auth_failure',
  'FAILSIM_TERMINAL',
  'FAILSIM_UNSUPPORTED',
  'sla_timeout_total',
  ...Object.values(FINANCIAL_GUARDRAIL_CODES),
]);

/** Explicit transient / retryable codes persisted after `failed_retryable` outcomes. */
/** @type {ReadonlySet<string>} */
const PERSISTED_RETRYABLE = new Set([
  'provider_network_error',
  'provider_timeout',
  'provider_exception',
  'PROVIDER_EXCEPTION',
  'provider_unavailable',
  'auth_failure_retry',
  'reloadly_malformed_provider_result',
  'FAILSIM_TIMEOUT',
  'FAILSIM_RETRY',
  'sla_stale_processing',
]);

/**
 * Whether a stored `WebTopupOrder.fulfillmentErrorCode` may be retried by policy.
 * @param {string | null | undefined} code
 */
export function isPersistedFulfillmentErrorRetryable(code) {
  if (code == null || typeof code !== 'string') return false;
  const c = code.trim();
  if (!c) return false;
  if (PERSISTED_NON_RETRYABLE.has(c)) return false;
  if (c === FULFILLMENT_DB_ERROR.RETRYABLE) return true;
  if (PERSISTED_RETRYABLE.has(c)) return true;
  return false;
}

/**
 * Backoff before the next dispatch, given how many attempts have already completed with failure.
 * `fulfillmentAttemptCount` is the value after the failed attempt (incremented at QUEUED claim).
 * @param {number} fulfillmentAttemptCount
 * @returns {number | null} ms delay, or null if no further auto-retry
 */
export function backoffMsBeforeNextAutoRetry(fulfillmentAttemptCount) {
  const max = env.webtopupAutoRetryMaxDispatchAttempts;
  const delays = env.webtopupAutoRetryBackoffMs;
  if (!(fulfillmentAttemptCount >= 1) || !(max >= 1)) return null;
  if (fulfillmentAttemptCount >= max) return null;
  const idx = fulfillmentAttemptCount - 1;
  if (idx < 0 || idx >= delays.length) return null;
  return delays[idx];
}

/**
 * @param {number} fulfillmentAttemptCount
 * @param {string | null | undefined} persistedErrorCode
 * @param {string} outcome
 * @returns {Date | null}
 */
export function computeFulfillmentNextRetryAt(
  fulfillmentAttemptCount,
  persistedErrorCode,
  outcome,
) {
  if (!env.webtopupAutoRetryEnabled) return null;
  if (outcome !== 'failed_retryable') return null;
  if (!isPersistedFulfillmentErrorRetryable(persistedErrorCode)) return null;
  const ms = backoffMsBeforeNextAutoRetry(fulfillmentAttemptCount);
  if (ms == null) return null;
  return new Date(Date.now() + ms);
}
