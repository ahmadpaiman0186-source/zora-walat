import { FULFILLMENT_STATUS } from '../../domain/topupOrder/statuses.js';
import { FULFILLMENT_DB_ERROR } from '../../domain/topupOrder/fulfillmentErrors.js';

/** @typedef {import('./providers/topupProviderTypes.js').TopupFulfillmentResult} TopupFulfillmentResult */

/**
 * Maps normalized provider result to DB patch fields (pure — for tests).
 * @param {TopupFulfillmentResult} result
 * @param {string} payloadHash
 */
export function fulfillmentResultToStatePatch(result, payloadHash) {
  const base = {
    lastProviderPayloadHash: payloadHash,
  };

  switch (result.outcome) {
    case 'succeeded':
      return {
        ...base,
        fulfillmentStatus: FULFILLMENT_STATUS.DELIVERED,
        fulfillmentReference: result.providerReference ?? null,
        fulfillmentCompletedAt: new Date(),
        fulfillmentFailedAt: null,
        fulfillmentErrorCode: null,
        fulfillmentErrorMessageSafe: null,
      };
    case 'pending_verification':
      return {
        ...base,
        fulfillmentStatus: FULFILLMENT_STATUS.PROCESSING,
        fulfillmentReference: result.providerReference ?? null,
        fulfillmentCompletedAt: null,
        fulfillmentFailedAt: null,
        fulfillmentErrorCode: FULFILLMENT_DB_ERROR.PROVIDER_VERIFYING,
        fulfillmentErrorMessageSafe:
          result.errorMessageSafe ?? 'Verifying top-up with provider',
      };
    case 'failed_retryable':
      return {
        ...base,
        fulfillmentStatus: FULFILLMENT_STATUS.FAILED,
        fulfillmentFailedAt: new Date(),
        fulfillmentErrorCode: FULFILLMENT_DB_ERROR.RETRYABLE,
        fulfillmentErrorMessageSafe: result.errorMessageSafe ?? 'Retryable failure',
        fulfillmentReference: result.providerReference ?? null,
        fulfillmentCompletedAt: null,
      };
    case 'failed_terminal':
      return {
        ...base,
        fulfillmentStatus: FULFILLMENT_STATUS.FAILED,
        fulfillmentFailedAt: new Date(),
        fulfillmentErrorCode: FULFILLMENT_DB_ERROR.TERMINAL,
        fulfillmentErrorMessageSafe: result.errorMessageSafe ?? 'Terminal failure',
        fulfillmentReference: null,
        fulfillmentCompletedAt: null,
      };
    case 'unsupported_route':
      return {
        ...base,
        fulfillmentStatus: FULFILLMENT_STATUS.FAILED,
        fulfillmentFailedAt: new Date(),
        fulfillmentErrorCode: FULFILLMENT_DB_ERROR.UNSUPPORTED_ROUTE,
        fulfillmentErrorMessageSafe: result.errorMessageSafe ?? 'Unsupported route',
        fulfillmentReference: null,
        fulfillmentCompletedAt: null,
      };
    case 'invalid_request':
      return {
        ...base,
        fulfillmentStatus: FULFILLMENT_STATUS.FAILED,
        fulfillmentFailedAt: new Date(),
        fulfillmentErrorCode:
          result.errorCode === 'AMOUNT_MISMATCH'
            ? FULFILLMENT_DB_ERROR.AMOUNT_MISMATCH
            : FULFILLMENT_DB_ERROR.INVALID_PRODUCT,
        fulfillmentErrorMessageSafe: result.errorMessageSafe ?? 'Invalid request',
        fulfillmentReference: null,
        fulfillmentCompletedAt: null,
      };
    default:
      return {
        ...base,
        fulfillmentStatus: FULFILLMENT_STATUS.FAILED,
        fulfillmentFailedAt: new Date(),
        fulfillmentErrorCode: FULFILLMENT_DB_ERROR.TERMINAL,
        fulfillmentErrorMessageSafe: 'Unknown provider outcome',
        fulfillmentReference: null,
        fulfillmentCompletedAt: null,
      };
  }
}
