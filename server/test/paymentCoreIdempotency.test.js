import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ORDER_STATUS } from '../src/constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../src/constants/paymentCheckoutStatus.js';
import {
  computeHostedCheckoutRequestHash,
  computeLogicalPaymentDedupeKey,
} from '../src/payment/idempotencyService.js';
import {
  assertFulfillmentPaymentGateOrThrow,
  evaluateFulfillmentPaymentGate,
} from '../src/payment/paymentFulfillmentGuard.js';
import {
  assertValidTransition,
  getNextAllowedStates,
  isTerminalState,
  PAYMENT_CORE_STATE,
  paymentCheckoutRowToL3State,
  validateLayer3WebPaidTransition,
} from '../src/payment/paymentStateMachine.js';
import { OrderTransitionError } from '../src/domain/orders/orderLifecycle.js';

const S = PAYMENT_CORE_STATE;

describe('paymentStateMachine (Layer 3)', () => {
  it('maps initiated pending row to PAYMENT_PENDING (pre-paid bucket)', () => {
    const st = paymentCheckoutRowToL3State({
      orderStatus: ORDER_STATUS.PENDING,
      status: PAYMENT_CHECKOUT_STATUS.INITIATED,
    });
    assert.equal(st, S.PAYMENT_PENDING);
  });

  it('maps checkout created to PAYMENT_PENDING', () => {
    const st = paymentCheckoutRowToL3State({
      orderStatus: ORDER_STATUS.PENDING,
      status: PAYMENT_CHECKOUT_STATUS.CHECKOUT_CREATED,
    });
    assert.equal(st, S.PAYMENT_PENDING);
  });

  it('maps paid+succeeded to PAID', () => {
    const st = paymentCheckoutRowToL3State({
      orderStatus: ORDER_STATUS.PAID,
      status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
    });
    assert.equal(st, S.PAID);
  });

  it('rejects PAYMENT_PENDING → PAID without webhook authority', () => {
    const r = assertValidTransition(S.PAYMENT_PENDING, S.PAID, {
      authority: 'api',
    });
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'paid_requires_stripe_webhook_authority');
  });

  it('allows PAYMENT_PENDING → PAID with stripe_webhook authority', () => {
    const r = assertValidTransition(S.PAYMENT_PENDING, S.PAID, {
      authority: 'stripe_webhook',
    });
    assert.equal(r.ok, true);
  });

  it('rejects backward PAID → PAYMENT_PENDING', () => {
    const r = assertValidTransition(S.PAID, S.PAYMENT_PENDING, {
      authority: 'stripe_webhook',
    });
    assert.equal(r.ok, false);
  });

  it('rejects skipping PAYMENT_PENDING from INIT to PAID (INIT is not row-mapped)', () => {
    const r = assertValidTransition(S.INIT, S.PAID, {
      authority: 'stripe_webhook',
    });
    assert.equal(r.ok, false);
  });

  it('isTerminalState for FULFILLED and FAILED', () => {
    assert.equal(isTerminalState(S.FULFILLED), true);
    assert.equal(isTerminalState(S.FAILED), true);
    assert.equal(isTerminalState(S.PAYMENT_PENDING), false);
  });

  it('getNextAllowedStates includes forward edges only', () => {
    assert.ok(getNextAllowedStates(S.PAYMENT_PENDING).includes(S.PAID));
    assert.ok(!getNextAllowedStates(S.PAID).includes(S.PAYMENT_PENDING));
  });

  it('validateLayer3WebPaidTransition ok for checkout-created pending', () => {
    const row = {
      orderStatus: ORDER_STATUS.PENDING,
      status: PAYMENT_CHECKOUT_STATUS.CHECKOUT_CREATED,
      postPaymentIncidentStatus: null,
    };
    const v = validateLayer3WebPaidTransition(row);
    assert.equal(v.ok, true);
    assert.equal(v.from, S.PAYMENT_PENDING);
  });
});

describe('idempotencyService (Layer 3)', () => {
  it('computeHostedCheckoutRequestHash is deterministic', () => {
    const a = computeHostedCheckoutRequestHash({
      userId: 'u1',
      amountCents: 500,
      senderCountryCode: 'US',
      operatorKey: 'roshan',
      recipientNational: '0701234567',
      packageId: null,
    });
    const b = computeHostedCheckoutRequestHash({
      userId: 'u1',
      amountCents: 500,
      senderCountryCode: 'US',
      operatorKey: 'roshan',
      recipientNational: '0701234567',
      packageId: null,
    });
    assert.equal(a, b);
    assert.equal(a.length, 64);
  });

  it('computeLogicalPaymentDedupeKey changes when bucket changes', () => {
    const k1 = computeLogicalPaymentDedupeKey({
      userId: 'u1',
      amountCents: 500,
      recipientNational: '0701234567',
      operatorKey: 'roshan',
      timestampBucketMs: 0,
    });
    const k2 = computeLogicalPaymentDedupeKey({
      userId: 'u1',
      amountCents: 500,
      recipientNational: '0701234567',
      operatorKey: 'roshan',
      timestampBucketMs: 60_000,
    });
    assert.notEqual(k1, k2);
  });
});

describe('paymentFulfillmentGuard (Layer 3)', () => {
  const paidReady = {
    orderStatus: ORDER_STATUS.PAID,
    status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
    productType: 'mobile_topup',
    currency: 'usd',
    amountUsdCents: 500,
    stripePaymentIntentId: 'pi_test1234567890',
    completedByWebhookEventId: 'evt_test1234567890',
    postPaymentIncidentStatus: null,
  };

  it('blocks fulfillment when order still PENDING', () => {
    const r = evaluateFulfillmentPaymentGate({
      orderStatus: ORDER_STATUS.PENDING,
      status: PAYMENT_CHECKOUT_STATUS.CHECKOUT_CREATED,
      productType: 'mobile_topup',
      currency: 'usd',
      amountUsdCents: 500,
      stripePaymentIntentId: 'pi_x',
      completedByWebhookEventId: 'evt_x',
      postPaymentIncidentStatus: null,
    });
    assert.equal(r.ok, false);
  });

  it('allows fulfillment gate when server-confirmed paid', () => {
    const r = evaluateFulfillmentPaymentGate(paidReady);
    assert.equal(r.ok, true);
  });

  it('assertFulfillmentPaymentGateOrThrow throws when not paid', () => {
    assert.throws(
      () =>
        assertFulfillmentPaymentGateOrThrow({
          orderStatus: ORDER_STATUS.PENDING,
          status: PAYMENT_CHECKOUT_STATUS.CHECKOUT_CREATED,
          productType: 'mobile_topup',
          currency: 'usd',
          amountUsdCents: 500,
          stripePaymentIntentId: 'pi_x',
          completedByWebhookEventId: 'evt_x',
          postPaymentIncidentStatus: null,
        }),
      OrderTransitionError,
    );
  });
});
