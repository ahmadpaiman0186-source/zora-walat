import { AIRTIME_ERROR_KIND, AIRTIME_OUTCOME } from './airtimeFulfillmentResult.js';
import { ORDER_STATUS } from '../../constants/orderStatus.js';

/**
 * Retry policy boundary — versioned so future behavior can be gated safely.
 * Auto-retry is OFF by default; callers use this only for classification / future workers.
 */
export const RETRY_POLICY_VERSION = 1;

/** Explicitly no automatic re-queue in-process (avoid duplicate fulfillment). */
export const AUTO_RETRY_ENABLED = false;

/** Soft ceiling for future automated follow-up attempts (operator-controlled jobs). */
export const TRANSIENT_RETRY_ATTEMPT_BUDGET = 3;

/**
 * Structured metadata for audits when a failure might be transient (no enqueue implied).
 *
 * @param {Record<string, unknown> | null | undefined} providerResult
 */
export function transientRetryHintFromProviderResult(providerResult) {
  const retryable = isRetryableFulfillmentFailure(providerResult);
  return {
    retryPolicyVersion: RETRY_POLICY_VERSION,
    transientEligible: retryable,
    autoRetryEnabled: AUTO_RETRY_ENABLED,
    budget: TRANSIENT_RETRY_ATTEMPT_BUDGET,
  };
}

/**
 * Whether a failed provider result may be worth a manual or batched retry later.
 * Does NOT enqueue work — only classification for audits / future job runners.
 *
 * Conservative: only transient kinds; never for terminal business failures.
 */
export function isRetryableFulfillmentFailure(providerResult) {
  if (!providerResult || providerResult.outcome === AIRTIME_OUTCOME.SUCCESS) {
    return false;
  }
  if (
    providerResult.outcome === AIRTIME_OUTCOME.PENDING_VERIFICATION ||
    providerResult.outcome === AIRTIME_OUTCOME.AMBIGUOUS ||
    providerResult.outcome === AIRTIME_OUTCOME.UNAVAILABLE
  ) {
    return false;
  }
  const kind = providerResult.errorKind;
  return (
    kind === AIRTIME_ERROR_KIND.TIMEOUT ||
    kind === AIRTIME_ERROR_KIND.NETWORK
  );
}

/**
 * Guards: future follow-up attempts must not resurrect terminal successes/cancels.
 */
export function orderAllowsFulfillmentRetry(order) {
  if (!order) return false;
  const t = order.orderStatus;
  if (t === ORDER_STATUS.FULFILLED || t === ORDER_STATUS.CANCELLED) {
    return false;
  }
  return t === ORDER_STATUS.FAILED;
}
