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

/** Classify failures for retries / ops (safe strings only). */
export const AIRTIME_ERROR_KIND = {
  CONFIG: 'config',
  NETWORK: 'network',
  TIMEOUT: 'timeout',
  PROVIDER: 'provider',
  UNKNOWN: 'unknown',
};
