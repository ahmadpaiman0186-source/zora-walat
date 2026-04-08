import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ORDER_STATUS } from '../src/constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../src/constants/paymentCheckoutStatus.js';
import { POST_PAYMENT_INCIDENT_STATUS } from '../src/constants/postPaymentIncidentStatus.js';
import {
  canOrderProceedToFulfillment,
  FULFILLMENT_GATE_DENIAL,
} from '../src/lib/phase1FulfillmentPaymentGate.js';
import { classifyTransactionFailure, TRANSACTION_FAILURE_CLASS } from '../src/constants/transactionFailureClass.js';

function paidOrder(patch = {}) {
  return {
    orderStatus: ORDER_STATUS.PAID,
    status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
    productType: 'mobile_topup',
    currency: 'usd',
    amountUsdCents: 1000,
    stripePaymentIntentId: 'pi_x',
    completedByWebhookEventId: 'evt_x',
    postPaymentIncidentStatus: POST_PAYMENT_INCIDENT_STATUS.NONE,
    ...patch,
  };
}

describe('phase1FulfillmentPaymentGate', () => {
  it('allows PAID + PAYMENT_SUCCEEDED + PI', () => {
    const r = canOrderProceedToFulfillment(paidOrder(), { lifecycle: 'PAID_ONLY' });
    assert.equal(r.ok, true);
  });

  it('allows evt-only correlation when PI missing', () => {
    const r = canOrderProceedToFulfillment(
      paidOrder({ stripePaymentIntentId: null, completedByWebhookEventId: 'evt_real' }),
      { lifecycle: 'PAID_ONLY' },
    );
    assert.equal(r.ok, true);
  });

  it('denies when payment status not server-confirmed', () => {
    const r = canOrderProceedToFulfillment(
      paidOrder({ status: PAYMENT_CHECKOUT_STATUS.PAYMENT_PENDING }),
      { lifecycle: 'PAID_ONLY' },
    );
    assert.equal(r.ok, false);
    assert.equal(r.denial, FULFILLMENT_GATE_DENIAL.PAYMENT_NOT_SERVER_CONFIRMED);
  });

  it('denies PROCESSING for PAID_ONLY worker path', () => {
    const r = canOrderProceedToFulfillment(
      paidOrder({ orderStatus: ORDER_STATUS.PROCESSING }),
      { lifecycle: 'PAID_ONLY' },
    );
    assert.equal(r.ok, false);
    assert.equal(r.denial, FULFILLMENT_GATE_DENIAL.ORDER_LIFECYCLE_NOT_ELIGIBLE);
  });

  it('allows PROCESSING for client kick mode when payment succeeded', () => {
    const r = canOrderProceedToFulfillment(
      paidOrder({ orderStatus: ORDER_STATUS.PROCESSING }),
      { lifecycle: 'PAID_OR_PROCESSING' },
    );
    assert.equal(r.ok, true);
  });

  it('denies refunded incident', () => {
    const r = canOrderProceedToFulfillment(
      paidOrder({ postPaymentIncidentStatus: POST_PAYMENT_INCIDENT_STATUS.REFUNDED }),
      { lifecycle: 'PAID_ONLY' },
    );
    assert.equal(r.ok, false);
    assert.equal(r.denial, FULFILLMENT_GATE_DENIAL.POST_PAYMENT_INCIDENT_BLOCKS);
  });

  it('denies disputed incident', () => {
    const r = canOrderProceedToFulfillment(
      paidOrder({ postPaymentIncidentStatus: POST_PAYMENT_INCIDENT_STATUS.DISPUTED }),
      { lifecycle: 'PAID_ONLY' },
    );
    assert.equal(r.ok, false);
    assert.equal(r.denial, FULFILLMENT_GATE_DENIAL.POST_PAYMENT_INCIDENT_BLOCKS);
  });
});

describe('classifyTransactionFailure', () => {
  it('maps P2002 to duplicate blocked', () => {
    const e = { code: 'P2002', message: 'uniq' };
    assert.equal(
      classifyTransactionFailure(e, {}),
      TRANSACTION_FAILURE_CLASS.PERMANENT_DUPLICATE_BLOCKED,
    );
  });

  it('maps PROVIDER_CIRCUIT_OPEN to transient provider', () => {
    const e = { code: 'PROVIDER_CIRCUIT_OPEN', message: 'backoff' };
    assert.equal(
      classifyTransactionFailure(e, {}),
      TRANSACTION_FAILURE_CLASS.TRANSIENT_PROVIDER,
    );
  });

  it('maps PROVIDER_RATE_LIMIT_REGIME to transient provider', () => {
    const e = { code: 'PROVIDER_RATE_LIMIT_REGIME', message: 'backoff' };
    assert.equal(
      classifyTransactionFailure(e, {}),
      TRANSACTION_FAILURE_CLASS.TRANSIENT_PROVIDER,
    );
  });
});
