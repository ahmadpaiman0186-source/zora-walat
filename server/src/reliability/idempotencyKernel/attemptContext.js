/**
 * @typedef {import('./keyModel.js').KeyMaterial} KeyMaterial
 */

/**
 * @typedef {'checkout' | 'webhook' | 'provider_execution' | 'wallet_intent' | 'order_retry'} AttemptKind
 */

/**
 * @typedef {object} AttemptContext
 * @property {AttemptKind} attemptKind
 * @property {KeyMaterial} keyMaterial
 * @property {Record<string, string>} [entityIds]
 * @property {{ stripePaid?: boolean, orderStatus?: string }} [paymentState]
 * @property {{
 *   lastAttemptStatus?: string,
 *   providerReference?: string,
 *   ambiguous?: boolean,
 *   proofPresent?: boolean,
 *   priorOutcome?: string,
 * }} [providerState]
 * @property {{ isRetry?: boolean, reason?: string, staleAgeMs?: number, staleThresholdMs?: number }} [retryContext]
 */

export const STALE_PENDING_DEFAULT_MS = 30 * 60 * 1000;
