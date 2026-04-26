import { FULFILLMENT_STATUS, PAYMENT_STATUS } from '../../domain/topupOrder/statuses.js';
import { isPersistedFulfillmentErrorRetryable } from '../../domain/topupOrder/webtopFulfillmentAutoRetryPolicy.js';

/**
 * @param {{ paymentStatus: string, fulfillmentStatus: string, fulfillmentErrorCode?: string | null }} row
 * @returns {{ ok: true } | { ok: false, code: string }}
 */
export function assertEligibleForInitialDispatch(row) {
  if (row.paymentStatus !== PAYMENT_STATUS.PAID) {
    return { ok: false, code: 'not_paid' };
  }
  if (row.fulfillmentStatus !== FULFILLMENT_STATUS.PENDING) {
    return { ok: false, code: 'invalid_fulfillment_state' };
  }
  return { ok: true };
}

/**
 * Retry: failed with retryable code, or explicit `retrying` state (future async workers).
 * @param {{ paymentStatus: string, fulfillmentStatus: string, fulfillmentErrorCode?: string | null }} row
 */
export function assertEligibleForRetryDispatch(row) {
  if (row.paymentStatus !== PAYMENT_STATUS.PAID) {
    return { ok: false, code: 'not_paid' };
  }
  if (row.fulfillmentStatus === FULFILLMENT_STATUS.RETRYING) {
    return { ok: true };
  }
  if (
    row.fulfillmentStatus === FULFILLMENT_STATUS.FAILED &&
    isPersistedFulfillmentErrorRetryable(row.fulfillmentErrorCode)
  ) {
    return { ok: true };
  }
  return { ok: false, code: 'invalid_fulfillment_state' };
}

/**
 * States that block a new dispatch (in-flight or terminal success).
 * @param {string} status
 */
export function isFulfillmentDispatchBlocked(status) {
  return (
    status === FULFILLMENT_STATUS.QUEUED ||
    status === FULFILLMENT_STATUS.PROCESSING ||
    status === FULFILLMENT_STATUS.DELIVERED
  );
}
