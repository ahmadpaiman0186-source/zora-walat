/**
 * L-11 refund operator guards (pure, no Stripe network).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  evaluateL11PostRefundVerify,
  evaluateL11RefundExecuteGuards,
  evaluateL11RefundTarget,
  L11_REFUND_APPROVAL_PHRASE,
  L11_TARGET_ORDER_ID,
  orderIdMatchesL11Target,
  refundApprovalPhraseMatches,
  stripeSecretKeyMode,
} from '../tools/stagingOperatorL11Refund.mjs';

const baseDb = {
  orderFound: true,
  paymentIntentMapped: true,
  stripePaymentIntentIdSuffix: '…04pvq0dr78',
  amountUsdCents: 500,
  currency: 'usd',
  postPaymentIncidentStatus: 'NONE',
  orderStatus: 'FULFILLED',
  paymentStatus: 'RECHARGE_COMPLETED',
};

const baseStripe = {
  verified: true,
  stripeMode: 'test_only',
  paymentIntentIdSuffix: '…04pvq0dr78',
  chargeIdSuffix: '…ch12345678',
  amountCents: 500,
  currency: 'usd',
  refundAlreadyExists: false,
  livemode: false,
};

describe('orderIdMatchesL11Target', () => {
  it('accepts only the L-11 candidate order id', () => {
    assert.equal(orderIdMatchesL11Target(L11_TARGET_ORDER_ID), true);
    assert.equal(orderIdMatchesL11Target('cmpother0003jy04pvq0dr78'), false);
  });
});

describe('evaluateL11RefundTarget', () => {
  it('passes with preflight and mapping', () => {
    const r = evaluateL11RefundTarget({
      preflightPass: true,
      orderId: L11_TARGET_ORDER_ID,
      db: baseDb,
      stripe: baseStripe,
    });
    assert.equal(r.pass, true);
    assert.equal(r.checks.stripe_verified, true);
  });

  it('fails when stripe verification is missing (no false PASS)', () => {
    const r = evaluateL11RefundTarget({
      preflightPass: true,
      orderId: L11_TARGET_ORDER_ID,
      db: baseDb,
      stripe: null,
    });
    assert.equal(r.pass, false);
    assert.equal(r.blockedReason, 'stripe_key_missing');
  });

  it('fails when stripe is not verified', () => {
    const r = evaluateL11RefundTarget({
      preflightPass: true,
      orderId: L11_TARGET_ORDER_ID,
      db: baseDb,
      stripe: { verified: false, blockedReason: 'stripe_payment_intent_not_found' },
    });
    assert.equal(r.pass, false);
    assert.equal(r.blockedReason, 'stripe_payment_intent_not_found');
  });

  it('does not pass when already REFUNDED in app', () => {
    const r = evaluateL11RefundTarget({
      preflightPass: true,
      orderId: L11_TARGET_ORDER_ID,
      db: { ...baseDb, postPaymentIncidentStatus: 'REFUNDED' },
      stripe: baseStripe,
    });
    assert.equal(r.pass, false);
    assert.equal(r.blockedReason, 'already_refunded_incident');
  });

  it('refuses wrong order id', () => {
    const r = evaluateL11RefundTarget({
      preflightPass: true,
      orderId: 'wrong-order-id',
      db: baseDb,
      stripe: baseStripe,
    });
    assert.equal(r.pass, false);
    assert.equal(r.blockedReason, 'order_id_not_l11_target');
  });

  it('refuses live stripe mode', () => {
    const r = evaluateL11RefundTarget({
      preflightPass: true,
      orderId: L11_TARGET_ORDER_ID,
      db: baseDb,
      stripe: { ...baseStripe, stripeMode: 'live', livemode: true },
    });
    assert.equal(r.pass, false);
  });
});

describe('evaluateL11RefundExecuteGuards', () => {
  it('refuses without exact approval phrase', () => {
    const r = evaluateL11RefundExecuteGuards({
      targetPass: true,
      orderId: L11_TARGET_ORDER_ID,
      approvalPhrase: 'wrong',
      stripeKeyMode: 'test',
      db: baseDb,
      stripe: baseStripe,
    });
    assert.equal(r.pass, false);
    assert.equal(r.blockedReason, 'refund_approval_missing');
  });

  it('passes with exact approval and test key', () => {
    const r = evaluateL11RefundExecuteGuards({
      targetPass: true,
      orderId: L11_TARGET_ORDER_ID,
      approvalPhrase: L11_REFUND_APPROVAL_PHRASE,
      stripeKeyMode: stripeSecretKeyMode('sk_test_' + 'a'.repeat(60)),
      db: baseDb,
      stripe: baseStripe,
    });
    assert.equal(r.pass, true);
    assert.equal(refundApprovalPhraseMatches(L11_REFUND_APPROVAL_PHRASE), true);
  });

  it('refuses live stripe key mode', () => {
    const r = evaluateL11RefundExecuteGuards({
      targetPass: true,
      orderId: L11_TARGET_ORDER_ID,
      approvalPhrase: L11_REFUND_APPROVAL_PHRASE,
      stripeKeyMode: 'live',
      db: baseDb,
      stripe: baseStripe,
    });
    assert.equal(r.pass, false);
    assert.equal(r.blockedReason, 'stripe_test_key_required');
  });
});

describe('evaluateL11PostRefundVerify', () => {
  it('requires REFUNDED incident', () => {
    const pass = evaluateL11PostRefundVerify({
      status: {
        http: 200,
        orderFound: true,
        orderStatus: 'FULFILLED',
        paymentStatus: 'RECHARGE_COMPLETED',
        paidConfirmed: true,
        fulfillmentAttemptCount: 1,
      },
      truth: { http: 200, postPaymentIncidentStatus: 'REFUNDED' },
    });
    assert.equal(pass.pass, true);

    const fail = evaluateL11PostRefundVerify({
      status: {
        http: 200,
        orderFound: true,
        orderStatus: 'FULFILLED',
        paymentStatus: 'RECHARGE_COMPLETED',
        paidConfirmed: true,
        fulfillmentAttemptCount: 1,
      },
      truth: { http: 200, postPaymentIncidentStatus: 'NONE' },
    });
    assert.equal(fail.pass, false);
  });
});

describe('l11-refund-target does not mutate', () => {
  it('evaluateL11RefundTarget has no execute side effects', () => {
    assert.equal(typeof evaluateL11RefundTarget, 'function');
    assert.equal(typeof evaluateL11RefundExecuteGuards, 'function');
  });
});
