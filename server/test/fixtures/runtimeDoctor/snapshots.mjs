/**
 * Static fixtures for CORE-04 detect-only doctor tests (no live DB/API).
 */

const BASE_TIME = '2026-05-29T12:00:00.000Z';
const STALE_TIME = '2026-05-29T10:00:00.000Z';

/** a. payment succeeded but provider missing */
export const paidNoProviderAttempts = {
  scanAt: BASE_TIME,
  orders: [
    {
      orderId: 'ord_paid_no_provider',
      orderStatus: 'PAID',
      stripePaid: true,
      paidAt: BASE_TIME,
      updatedAt: BASE_TIME,
      fulfillmentAttempts: [],
      auditEvents: ['stripe_webhook_received'],
    },
  ],
};

/** b. provider success but order not completed */
export const providerSuccessOrderProcessing = {
  scanAt: BASE_TIME,
  orders: [
    {
      orderId: 'ord_provider_ok_processing',
      orderStatus: 'PROCESSING',
      stripePaid: true,
      fulfillmentAttempts: [
        {
          attemptId: 'att_1',
          status: 'SUCCESS',
          providerReference: 'rl_tx_100',
          providerKey: 'reloadly',
          providerReportedSuccess: true,
        },
      ],
      auditEvents: ['order_status_changed', 'stripe_webhook_received'],
    },
  ],
};

/** c. completed without provider reference */
export const fulfilledNoReference = {
  scanAt: BASE_TIME,
  orders: [
    {
      orderId: 'ord_fulfilled_no_ref',
      orderStatus: 'FULFILLED',
      stripePaid: true,
      fulfillmentAttempts: [
        { attemptId: 'att_1', status: 'SUCCESS', providerReference: '' },
      ],
      auditEvents: ['order_status_changed'],
    },
  ],
};

/** d. duplicate provider reference across orders */
export const duplicateProviderReference = {
  scanAt: BASE_TIME,
  orders: [
    {
      orderId: 'ord_a',
      orderStatus: 'FULFILLED',
      fulfillmentAttempts: [
        {
          attemptId: 'att_a',
          status: 'SUCCESS',
          providerReference: 'rl_dup_99',
        },
      ],
    },
    {
      orderId: 'ord_b',
      orderStatus: 'PROCESSING',
      fulfillmentAttempts: [
        {
          attemptId: 'att_b',
          status: 'SUCCESS',
          providerReference: 'rl_dup_99',
        },
      ],
    },
  ],
};

/** e. stale pending order */
export const stalePendingOrder = {
  scanAt: BASE_TIME,
  stalePendingThresholdMs: 3_600_000,
  orders: [
    {
      orderId: 'ord_stale_processing',
      orderStatus: 'PROCESSING',
      updatedAt: STALE_TIME,
      stripePaid: true,
      fulfillmentAttempts: [],
      auditEvents: ['order_status_changed'],
    },
  ],
};

/** f. ambiguous provider status on fulfilled order */
export const ambiguousOnFulfilled = {
  scanAt: BASE_TIME,
  orders: [
    {
      orderId: 'ord_ambiguous_fulfilled',
      orderStatus: 'FULFILLED',
      stripePaid: true,
      fulfillmentAttempts: [
        {
          attemptId: 'att_1',
          status: 'ambiguous',
          ambiguous: true,
          providerReference: '',
        },
      ],
      auditEvents: ['order_status_changed'],
    },
  ],
};

/** g. missing audit event */
export const missingAudit = {
  scanAt: BASE_TIME,
  orders: [
    {
      orderId: 'ord_missing_audit',
      orderStatus: 'PAID',
      stripePaid: true,
      auditEvents: [],
      fulfillmentAttempts: [],
    },
  ],
};

/** h. clean healthy case */
export const healthyOrder = {
  scanAt: BASE_TIME,
  orders: [
    {
      orderId: 'ord_healthy',
      orderStatus: 'FULFILLED',
      stripePaid: true,
      idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
      fulfillmentAttempts: [
        {
          attemptId: 'att_ok',
          status: 'SUCCESS',
          providerReference: 'rl_tx_ok_1',
          providerKey: 'reloadly',
          providerReportedSuccess: true,
        },
      ],
      auditEvents: ['stripe_webhook_received', 'order_status_changed'],
    },
  ],
  stripeWebhookEvents: [{ eventId: 'evt_healthy_1', deliveryCount: 1 }],
};
