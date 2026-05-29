/**
 * CORE-06 no-pay-no-service proof fixtures (a–l).
 */

export const healthyPaymentProviderAudit = {
  entityIds: { orderId: 'ord_healthy', userId: 'user_ok' },
  payment: {
    stripePaid: true,
    paymentIntentConfirmed: true,
    webhookPaymentReceived: true,
    orderStatus: 'PROCESSING',
  },
  provider: {
    hasSuccessProof: true,
    providerReference: 'RLY_OK_100',
    providerExecuted: true,
    lastAttemptStatus: 'SUCCESS',
  },
  order: { orderStatus: 'PROCESSING', serviceDeliveredFlag: false },
  audit: {
    requiredEvents: ['stripe_webhook_received', 'order_status_changed'],
    presentEvents: ['stripe_webhook_received', 'order_status_changed', 'provider_success'],
  },
  idempotency: { duplicateRisk: false, ambiguousKey: false },
};

export const paidNoProviderProof = {
  entityIds: { orderId: 'ord_paid_no_prv' },
  payment: { stripePaid: true, orderStatus: 'PAID' },
  provider: { providerExecuted: false },
  order: { orderStatus: 'PAID' },
  audit: { requiredEvents: ['stripe_webhook_received'], presentEvents: ['stripe_webhook_received'] },
};

export const providerSuccessNoPayment = {
  entityIds: { orderId: 'ord_prv_no_pay' },
  payment: { stripePaid: false, orderStatus: 'PENDING' },
  provider: {
    hasSuccessProof: true,
    providerReference: 'RLY_ANOMALY_1',
    providerExecuted: true,
    lastAttemptStatus: 'SUCCESS',
  },
};

export const completedWithoutProviderRef = {
  entityIds: { orderId: 'ord_fulfilled_no_ref' },
  payment: { stripePaid: true, orderStatus: 'FULFILLED' },
  provider: { providerReference: undefined },
  order: { orderStatus: 'FULFILLED', serviceDeliveredFlag: true },
};

export const providerTimeoutAmbiguous = {
  entityIds: { orderId: 'ord_prv_ambig' },
  payment: { stripePaid: true, orderStatus: 'PROCESSING' },
  provider: { timeout: true, ambiguous: true, lastAttemptStatus: 'UNKNOWN', providerExecuted: true },
  order: { orderStatus: 'PROCESSING' },
};

export const deliveredFlagNoPayment = {
  entityIds: { orderId: 'ord_delivered_no_pay' },
  payment: { stripePaid: false },
  order: { serviceDeliveredFlag: true, orderStatus: 'FULFILLED' },
  provider: { hasSuccessProof: false },
};

export const deliveredFlagNoProvider = {
  entityIds: { orderId: 'ord_delivered_no_prv' },
  payment: { stripePaid: true, orderStatus: 'PROCESSING' },
  order: { serviceDeliveredFlag: true, orderStatus: 'PROCESSING' },
  provider: { hasSuccessProof: false, providerExecuted: true },
};

export const duplicateIdempotencyRisk = {
  entityIds: { orderId: 'ord_idem_dup' },
  payment: { stripePaid: true, orderStatus: 'PAID' },
  provider: { hasSuccessProof: true, providerReference: 'RLY_X', lastAttemptStatus: 'SUCCESS' },
  idempotency: { duplicateRisk: true, idempotencyConflict: true },
  audit: { requiredEvents: ['stripe_webhook_received'], presentEvents: ['stripe_webhook_received'] },
};

export const missingAuditEvent = {
  entityIds: { orderId: 'ord_audit_gap' },
  payment: { stripePaid: true, orderStatus: 'PAID' },
  provider: { hasSuccessProof: true, providerReference: 'RLY_AUD', lastAttemptStatus: 'SUCCESS' },
  audit: {
    requiredEvents: ['stripe_webhook_received', 'order_status_changed', 'provider_success'],
    presentEvents: ['stripe_webhook_received'],
  },
};

export const stalePendingPaid = {
  entityIds: { orderId: 'ord_stale_proc' },
  payment: { stripePaid: true, orderStatus: 'PROCESSING' },
  provider: { providerExecuted: false },
  pending: { staleAgeMs: 50 * 60 * 1000, staleThresholdMs: 30 * 60 * 1000 },
  audit: { requiredEvents: [], presentEvents: [] },
};

export const failedPaymentNoProvider = {
  entityIds: { orderId: 'ord_failed_no_prv' },
  payment: { paymentFailed: true, stripePaid: false, orderStatus: 'FAILED' },
  provider: { providerExecuted: false },
  order: { orderStatus: 'FAILED' },
};

export const sandboxNonMoneyProof = {
  entityIds: { orderId: 'ord_sandbox_sim' },
  sandbox: { isSandbox: true, nonMoneyProof: true, proofLabel: 'xch06_simulation' },
  payment: { stripePaid: false },
  provider: { providerExecuted: false },
  order: { orderStatus: 'PENDING' },
};
