/**
 * L-78 shadow safety gate — route/handler-shaped context (local simulation only).
 */

export const SHADOW_SAFETY_GATE_SCHEMA_VERSION = 1;

/**
 * @typedef {'webhook_post_commit' | 'fulfillment_dispatch'} ShadowFulfillmentBoundary
 */

/**
 * Handler-shaped snapshot at webhook → fulfillment boundary (no live Stripe/DB objects).
 * @typedef {object} ShadowWebhookFulfillmentContext
 * @property {string} scenarioId
 * @property {'shadow'} mode — must be `shadow`; live routes never pass this in L-78
 * @property {ShadowFulfillmentBoundary} boundary
 * @property {string} stripeEventType
 * @property {string} [stripeEventId]
 * @property {string} [internalCheckoutId]
 * @property {string} [orderId]
 * @property {string} [paymentCheckoutStatus] — e.g. PAID, PENDING, EXPIRED
 * @property {string} [orderStatus]
 * @property {string} [sessionPaymentStatus] — paid | unpaid | no_payment_required
 * @property {string} [sessionStatus] — complete | expired | open
 * @property {boolean} [stripePaid]
 * @property {boolean} [webhookPaymentReceived]
 * @property {string} [providerReference]
 * @property {boolean} [providerProofPresent]
 * @property {string[]} [priorWebhookEventIds] — simulated idempotency registry seeds
 * @property {string[]} [priorCompletedProviderAttemptKeys]
 * @property {boolean} [duplicateOrderRisk]
 * @property {boolean} [missingIdempotencyKey]
 */

/**
 * @typedef {object} ShadowSafetyGateReport
 * @property {number} schemaVersion
 * @property {string} scenarioId
 * @property {'code_only_shadow_safety_gate'} mode
 * @property {ShadowFulfillmentBoundary} boundary
 * @property {boolean} shadowIntegration
 * @property {boolean} liveRouteEnforcement
 * @property {boolean} fulfillmentIntentAllowed
 * @property {boolean} wouldScheduleFulfillment
 * @property {import('../wiredPathSafetyDryRun/types.js').WiredPathDryRunReport} wiredPathReport
 * @property {object} diagnostics
 * @property {object} mutations
 * @property {object} safety
 */
