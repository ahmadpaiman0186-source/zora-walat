/**
 * Normalized provider outcome for airtime fulfillment (no secrets).
 * Used by fulfillmentProcessingService to persist attempt + order state.
 */

export const AIRTIME_OUTCOME = {
  SUCCESS: 'success',
  FAILURE: 'failure',
  UNAVAILABLE: 'unavailable',
  /** Provider accepted or is processing; no confirmed delivery proof yet. */
  PENDING_VERIFICATION: 'pending_verification',
  /** Response incomplete or contradictory — cannot prove success or safe failure. */
  AMBIGUOUS: 'ambiguous',
};

/** Finite set of outcomes the fulfillment completion transaction may branch on. */
export const AIRTIME_OUTCOME_VALUES = Object.freeze([
  AIRTIME_OUTCOME.SUCCESS,
  AIRTIME_OUTCOME.FAILURE,
  AIRTIME_OUTCOME.UNAVAILABLE,
  AIRTIME_OUTCOME.PENDING_VERIFICATION,
  AIRTIME_OUTCOME.AMBIGUOUS,
]);

/**
 * @param {unknown} v
 * @returns {v is string}
 */
export function isValidAirtimeOutcome(v) {
  if (v == null || typeof v !== 'string') return false;
  return AIRTIME_OUTCOME_VALUES.includes(String(v).trim().toLowerCase());
}

/** Classify failures for retries / ops (safe strings only). */
export const AIRTIME_ERROR_KIND = {
  CONFIG: 'config',
  NETWORK: 'network',
  TIMEOUT: 'timeout',
  PROVIDER: 'provider',
  UNKNOWN: 'unknown',
};
