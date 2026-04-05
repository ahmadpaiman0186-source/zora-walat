/**
 * @typedef {'airtime' | 'data' | 'calling'} TopupProductType
 */

/**
 * Normalized request to any telecom top-up provider.
 * @typedef {object} TopupFulfillmentRequest
 * @property {string} orderId
 * @property {string} destinationCountry ISO-ish code
 * @property {TopupProductType} productType
 * @property {string} operatorKey
 * @property {string} operatorLabel
 * @property {string} phoneNationalDigits
 * @property {string} productId
 * @property {string} productName
 * @property {number} amountCents
 * @property {string} currency
 */

/**
 * @typedef {'succeeded' | 'pending_verification' | 'failed_retryable' | 'failed_terminal' | 'unsupported_route' | 'invalid_request'} TopupFulfillmentOutcome
 */

/**
 * Normalized provider response (no raw HTTP / secrets).
 * @typedef {object} TopupFulfillmentResult
 * @property {TopupFulfillmentOutcome} outcome
 * @property {string} [providerReference]
 * @property {string} [errorCode]
 * @property {string} [errorMessageSafe]
 */

/**
 * Declared capabilities for routing / UX (future catalog sync).
 * @typedef {object} TopupProviderCapabilities
 * @property {TopupProductType[]} productTypes
 * @property {string[]} destinationCountries `*` means any
 * @property {boolean} operatorsWildcard
 */

export {};
