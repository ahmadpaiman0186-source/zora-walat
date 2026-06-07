/**
 * L-78 shadow safety gate — route/handler-shaped fixtures.
 */

/** @typedef {import('../../src/reliability/shadowSafetyGate/types.js').ShadowWebhookFulfillmentContext & { expectedFulfillmentIntentAllowed: boolean }} ShadowScenario */

/** @type {ShadowScenario} */
export const paidValidUniqueAllowsDryRunIntent = {
  scenarioId: 'paid_valid_unique_allows_dry_run_intent',
  mode: 'shadow',
  boundary: 'webhook_post_commit',
  stripeEventType: 'checkout.session.completed',
  stripeEventId: 'evt_shadow_paid_001',
  internalCheckoutId: 'chk_shadow_paid_001',
  orderId: 'ord_shadow_paid_001',
  paymentCheckoutStatus: 'PAID',
  orderStatus: 'PROCESSING',
  sessionPaymentStatus: 'paid',
  sessionStatus: 'complete',
  stripePaid: true,
  webhookPaymentReceived: true,
  providerReference: 'RLY_SHADOW_OK',
  providerProofPresent: true,
  priorWebhookEventIds: [],
  expectedFulfillmentIntentAllowed: true,
};

/** @type {ShadowScenario} */
export const unpaidWebhookBlocks = {
  scenarioId: 'unpaid_webhook_blocks',
  mode: 'shadow',
  boundary: 'webhook_post_commit',
  stripeEventType: 'checkout.session.completed',
  stripeEventId: 'evt_shadow_unpaid_001',
  internalCheckoutId: 'chk_shadow_unpaid_001',
  orderId: 'ord_shadow_unpaid_001',
  paymentCheckoutStatus: 'PENDING',
  orderStatus: 'PENDING',
  sessionPaymentStatus: 'unpaid',
  sessionStatus: 'open',
  stripePaid: false,
  webhookPaymentReceived: false,
  expectedFulfillmentIntentAllowed: false,
};

/** @type {ShadowScenario} */
export const expiredSessionBlocks = {
  scenarioId: 'expired_session_blocks',
  mode: 'shadow',
  boundary: 'webhook_post_commit',
  stripeEventType: 'checkout.session.expired',
  stripeEventId: 'evt_shadow_expired_001',
  internalCheckoutId: 'chk_shadow_expired_001',
  orderId: 'ord_shadow_expired_001',
  paymentCheckoutStatus: 'EXPIRED',
  orderStatus: 'CANCELLED',
  sessionPaymentStatus: 'unpaid',
  sessionStatus: 'expired',
  stripePaid: false,
  webhookPaymentReceived: false,
  expectedFulfillmentIntentAllowed: false,
};

/** @type {ShadowScenario} */
export const duplicateWebhookBlocks = {
  scenarioId: 'duplicate_webhook_blocks',
  mode: 'shadow',
  boundary: 'webhook_post_commit',
  stripeEventType: 'checkout.session.completed',
  stripeEventId: 'evt_stripe_dup_shadow',
  internalCheckoutId: 'chk_shadow_dup_wh',
  orderId: 'ord_shadow_dup_wh',
  paymentCheckoutStatus: 'PAID',
  orderStatus: 'PROCESSING',
  sessionPaymentStatus: 'paid',
  sessionStatus: 'complete',
  stripePaid: true,
  webhookPaymentReceived: true,
  providerReference: 'RLY_SHADOW_OK',
  providerProofPresent: true,
  priorWebhookEventIds: ['evt_stripe_dup_shadow'],
  expectedFulfillmentIntentAllowed: false,
};

/** @type {ShadowScenario} */
export const duplicateProviderDispatchBlocks = {
  scenarioId: 'duplicate_provider_dispatch_blocks',
  mode: 'shadow',
  boundary: 'fulfillment_dispatch',
  stripeEventType: 'checkout.session.completed',
  stripeEventId: 'evt_shadow_prv_dup',
  internalCheckoutId: 'chk_shadow_prv_dup',
  orderId: 'ord_shadow_prv_dup',
  paymentCheckoutStatus: 'PAID',
  orderStatus: 'PROCESSING',
  stripePaid: true,
  providerReference: 'RLY_SHADOW_OK',
  providerProofPresent: true,
  duplicateOrderRisk: true,
  priorCompletedProviderAttemptKeys: [
    'v1|provider_attempt|internal|dispatch|ord_shadow_prv_dup|att_duplicate_provider_dispatch_blocks',
  ],
  expectedFulfillmentIntentAllowed: false,
};

/** @type {ShadowScenario} */
export const missingIdempotencyKeyFailClosed = {
  scenarioId: 'missing_idempotency_key_fail_closed',
  mode: 'shadow',
  boundary: 'webhook_post_commit',
  stripeEventType: 'checkout.session.completed',
  stripeEventId: 'evt_shadow_no_key',
  internalCheckoutId: 'chk_shadow_no_key',
  orderId: 'ord_shadow_no_key',
  paymentCheckoutStatus: 'PAID',
  orderStatus: 'PROCESSING',
  stripePaid: true,
  providerReference: 'RLY_SHADOW_OK',
  providerProofPresent: true,
  missingIdempotencyKey: true,
  expectedFulfillmentIntentAllowed: false,
};

/** @type {ShadowScenario} */
export const missingPaymentProofFailClosed = {
  scenarioId: 'missing_payment_proof_fail_closed',
  mode: 'shadow',
  boundary: 'webhook_post_commit',
  stripeEventType: 'checkout.session.completed',
  stripeEventId: 'evt_shadow_no_pay_proof',
  internalCheckoutId: 'chk_shadow_no_pay_proof',
  orderId: 'ord_shadow_no_pay_proof',
  paymentCheckoutStatus: 'PENDING',
  orderStatus: 'PENDING',
  sessionPaymentStatus: 'unpaid',
  sessionStatus: 'open',
  stripePaid: false,
  webhookPaymentReceived: false,
  providerProofPresent: false,
  expectedFulfillmentIntentAllowed: false,
};

/** @type {ShadowScenario[]} */
export const allShadowScenarios = [
  paidValidUniqueAllowsDryRunIntent,
  unpaidWebhookBlocks,
  expiredSessionBlocks,
  duplicateWebhookBlocks,
  duplicateProviderDispatchBlocks,
  missingIdempotencyKeyFailClosed,
  missingPaymentProofFailClosed,
];
