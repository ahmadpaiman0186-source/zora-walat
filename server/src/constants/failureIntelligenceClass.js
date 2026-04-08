/**
 * Cross-cutting failure taxonomy for dashboards / SLO burn (not the same as transactionFailureClass).
 * Values are stable snake_case for Prometheus labels.
 */
export const FAILURE_INTELLIGENCE_CLASS = {
  PROVIDER_FAILURE: 'provider_failure',
  UNAVAILABLE: 'unavailable',
  UNKNOWN: 'unknown',
  ORCHESTRATION_ERROR: 'orchestration_error',
  RETRY_EXHAUSTED: 'retry_exhausted',
  TRANSIENT: 'transient',
  VALIDATION: 'validation',
  DUPLICATE_BLOCKED: 'duplicate_blocked',
};
