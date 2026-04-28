import { FULFILLMENT_STATUS } from '../../domain/topupOrder/statuses.js';
import { persistedFulfillmentErrorCode } from '../../domain/topupOrder/webtopFulfillmentFailureSemantics.js';

/** @typedef {import('./providers/topupProviderTypes.js').TopupFulfillmentResult} TopupFulfillmentResult */

/**
 * Maps normalized provider result to DB patch fields (pure — for tests).
 * `fulfillmentErrorCode` prefers provider `errorCode` when set, else stable bucket codes.
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
        fulfillmentErrorCode: persistedFulfillmentErrorCode(result),
        fulfillmentErrorMessageSafe:
          result.errorMessageSafe ?? 'Verifying top-up with provider',
      };
    case 'failed_retryable':
      return {
        ...base,
        fulfillmentStatus: FULFILLMENT_STATUS.FAILED,
        fulfillmentFailedAt: new Date(),
        fulfillmentErrorCode: persistedFulfillmentErrorCode(result),
        fulfillmentErrorMessageSafe: result.errorMessageSafe ?? 'Retryable failure',
        fulfillmentReference: result.providerReference ?? null,
        fulfillmentCompletedAt: null,
      };
    case 'failed_terminal':
      return {
        ...base,
        fulfillmentStatus: FULFILLMENT_STATUS.FAILED,
        fulfillmentFailedAt: new Date(),
        fulfillmentErrorCode: persistedFulfillmentErrorCode(result),
        fulfillmentErrorMessageSafe: result.errorMessageSafe ?? 'Terminal failure',
        fulfillmentReference: null,
        fulfillmentCompletedAt: null,
      };
    case 'unsupported_route':
      return {
        ...base,
        fulfillmentStatus: FULFILLMENT_STATUS.FAILED,
        fulfillmentFailedAt: new Date(),
        fulfillmentErrorCode: persistedFulfillmentErrorCode(result),
        fulfillmentErrorMessageSafe: result.errorMessageSafe ?? 'Unsupported route',
        fulfillmentReference: null,
        fulfillmentCompletedAt: null,
      };
    case 'invalid_request':
      return {
        ...base,
        fulfillmentStatus: FULFILLMENT_STATUS.FAILED,
        fulfillmentFailedAt: new Date(),
        fulfillmentErrorCode: persistedFulfillmentErrorCode(result),
        fulfillmentErrorMessageSafe: result.errorMessageSafe ?? 'Invalid request',
        fulfillmentReference: null,
        fulfillmentCompletedAt: null,
      };
    default:
      return {
        ...base,
        fulfillmentStatus: FULFILLMENT_STATUS.FAILED,
        fulfillmentFailedAt: new Date(),
        fulfillmentErrorCode: persistedFulfillmentErrorCode(result),
        fulfillmentErrorMessageSafe: 'Unknown provider outcome',
        fulfillmentReference: null,
        fulfillmentCompletedAt: null,
      };
  }
}
