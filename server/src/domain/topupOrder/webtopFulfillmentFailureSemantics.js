/**
 * WebTopup fulfillment failure classification for persistence + structured logs.
 * @typedef {import('../../services/topupFulfillment/providers/topupProviderTypes.js').TopupFulfillmentResult} TopupFulfillmentResult
 */

import { FULFILLMENT_DB_ERROR } from './fulfillmentErrors.js';

/**
 * Whether the provider outcome should be retried by policy (ops / admin retry path).
 * @param {TopupFulfillmentResult} result
 */
export function fulfillmentFailureRetryable(result) {
  return result.outcome === 'failed_retryable';
}

/**
 * Whether this outcome is a terminal failure for customer-visible fulfillment (not success, not in-flight verify).
 * @param {TopupFulfillmentResult} result
 */
export function isTerminalFulfillmentFailure(result) {
  const o = result.outcome;
  return (
    o === 'failed_retryable' ||
    o === 'failed_terminal' ||
    o === 'invalid_request' ||
    o === 'unsupported_route'
  );
}

/**
 * Stable code persisted on `WebTopupOrder.fulfillmentErrorCode` (provider-first, then bucket).
 * @param {TopupFulfillmentResult} result
 * @returns {string | null}
 */
export function persistedFulfillmentErrorCode(result) {
  if (result.outcome === 'invalid_request' && result.errorCode === 'AMOUNT_MISMATCH') {
    return FULFILLMENT_DB_ERROR.AMOUNT_MISMATCH;
  }

  const raw = result.errorCode;
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw.trim().slice(0, 80);
  }
  switch (result.outcome) {
    case 'failed_retryable':
      return FULFILLMENT_DB_ERROR.RETRYABLE;
    case 'failed_terminal':
      return FULFILLMENT_DB_ERROR.TERMINAL;
    case 'invalid_request':
      return FULFILLMENT_DB_ERROR.INVALID_PRODUCT;
    case 'unsupported_route':
      return FULFILLMENT_DB_ERROR.UNSUPPORTED_ROUTE;
    case 'pending_verification':
      return FULFILLMENT_DB_ERROR.PROVIDER_VERIFYING;
    default:
      return FULFILLMENT_DB_ERROR.TERMINAL;
  }
}
