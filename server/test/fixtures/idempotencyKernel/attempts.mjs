/**
 * CORE-05 idempotency kernel fixtures (a–k) — static contexts, no DB/env.
 */

export const duplicateCheckoutAttempt = {
  attemptKind: 'checkout',
  keyMaterial: {
    scope: 'checkout',
    source: 'client',
    type: 'create_session',
    clientKey: 'idem_chk_user42_v1',
    userId: 'user_42',
  },
  entityIds: { userId: 'user_42', orderId: 'ord_dup_chk_2' },
};

export const duplicateCheckoutSeed = {
  idempotencyKey:
    'v1|checkout|client|create_session|idem_chk_user42_v1|user_42',
  outcome: 'completed',
  attemptKind: 'checkout',
  entityIds: { orderId: 'ord_dup_chk_1' },
};

export const duplicateWebhookAttempt = {
  attemptKind: 'webhook',
  keyMaterial: {
    scope: 'webhook',
    source: 'stripe',
    type: 'checkout.session.completed',
    eventId: 'evt_stripe_dup_001',
  },
  entityIds: { eventId: 'evt_stripe_dup_001', orderId: 'ord_wh_1' },
};

export const duplicateWebhookSeed = {
  idempotencyKey:
    'v1|webhook|stripe|checkout.session.completed|evt_stripe_dup_001|ord_wh_1',
  outcome: 'completed',
  attemptKind: 'webhook',
  webhookEventId: 'evt_stripe_dup_001',
  entityIds: { eventId: 'evt_stripe_dup_001' },
};

export const duplicateProviderExecutionAttempt = {
  attemptKind: 'provider_execution',
  keyMaterial: {
    scope: 'provider_attempt',
    source: 'internal',
    type: 'dispatch',
    orderId: 'ord_prv_dup',
    attemptId: 'att_001',
  },
  entityIds: { orderId: 'ord_prv_dup', attemptId: 'att_001' },
  providerState: { priorOutcome: 'completed', lastAttemptStatus: 'SUCCESS' },
  retryContext: { isRetry: true },
};

export const duplicateProviderExecutionSeed = {
  idempotencyKey: 'v1|provider_attempt|internal|dispatch|ord_prv_dup|att_001',
  outcome: 'completed',
  attemptKind: 'provider_execution',
  entityIds: { orderId: 'ord_prv_dup', attemptId: 'att_001' },
};

export const duplicateProviderReferenceAttempt = {
  attemptKind: 'provider_execution',
  keyMaterial: {
    scope: 'provider_attempt',
    source: 'internal',
    type: 'dispatch',
    orderId: 'ord_prv_ref_b',
    attemptId: 'att_b1',
  },
  entityIds: { orderId: 'ord_prv_ref_b', attemptId: 'att_b1' },
  providerState: { providerReference: 'RLY_REF_SHARED_99' },
};

export const duplicateProviderReferenceSeed = {
  idempotencyKey: 'v1|provider_attempt|internal|dispatch|ord_prv_ref_a|att_a1',
  outcome: 'completed',
  attemptKind: 'provider_execution',
  providerReference: 'RLY_REF_SHARED_99',
  entityIds: { orderId: 'ord_prv_ref_a' },
};

export const retryAfterProviderTimeout = {
  attemptKind: 'provider_execution',
  keyMaterial: {
    scope: 'provider_attempt',
    source: 'internal',
    type: 'dispatch',
    orderId: 'ord_retry_timeout',
    attemptId: 'att_retry_2',
  },
  entityIds: { orderId: 'ord_retry_timeout', attemptId: 'att_retry_2' },
  providerState: { lastAttemptStatus: 'TIMEOUT', ambiguous: true },
  retryContext: { isRetry: true, reason: 'worker_timeout' },
};

export const retryAfterProviderSuccess = {
  attemptKind: 'provider_execution',
  keyMaterial: {
    scope: 'provider_attempt',
    source: 'internal',
    type: 'dispatch',
    orderId: 'ord_retry_ok',
    attemptId: 'att_retry_dup',
  },
  entityIds: { orderId: 'ord_retry_ok', attemptId: 'att_retry_dup' },
  providerState: { lastAttemptStatus: 'SUCCESS', priorOutcome: 'completed' },
  retryContext: { isRetry: true },
};

export const missingIdempotencyKeyMaterial = {
  attemptKind: 'checkout',
  keyMaterial: {
    scope: 'checkout',
    source: 'client',
    type: 'create_session',
  },
  entityIds: {},
};

export const stalePendingOrderRetry = {
  attemptKind: 'order_retry',
  keyMaterial: {
    scope: 'order_retry',
    source: 'system',
    type: 'status_poll',
    orderId: 'ord_stale_proc',
  },
  entityIds: { orderId: 'ord_stale_proc' },
  paymentState: { orderStatus: 'PROCESSING', stripePaid: true },
  retryContext: { isRetry: true, staleAgeMs: 45 * 60 * 1000, staleThresholdMs: 30 * 60 * 1000 },
};

export const healthyFirstAttempt = {
  attemptKind: 'checkout',
  keyMaterial: {
    scope: 'checkout',
    source: 'client',
    type: 'create_session',
    clientKey: 'idem_healthy_first',
    userId: 'user_ok',
  },
  entityIds: { userId: 'user_ok', orderId: 'ord_healthy_1' },
  paymentState: { orderStatus: 'PENDING', stripePaid: false },
};

export const paymentSucceededProviderProofMissing = {
  attemptKind: 'provider_execution',
  keyMaterial: {
    scope: 'provider_attempt',
    source: 'internal',
    type: 'dispatch',
    orderId: 'ord_paid_no_prv',
    attemptId: 'att_first',
  },
  entityIds: { orderId: 'ord_paid_no_prv', attemptId: 'att_first' },
  paymentState: { orderStatus: 'PAID', stripePaid: true },
  providerState: { proofPresent: false },
};

export const completedOrderWithoutProviderProof = {
  attemptKind: 'order_retry',
  keyMaterial: {
    scope: 'order_retry',
    source: 'system',
    type: 'reconcile',
    orderId: 'ord_fulfilled_no_prv',
  },
  entityIds: { orderId: 'ord_fulfilled_no_prv' },
  paymentState: { orderStatus: 'FULFILLED', stripePaid: true },
  providerState: { proofPresent: false },
};
