/**
 * Phase 7 — fulfillment / failure handling audit anchors (no DB).
 * Deep paths: fulfillmentProcessingService, fulfillmentEligibility, provider normalization.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ORDER_STATUS } from '../src/constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../src/constants/paymentCheckoutStatus.js';
import { POST_PAYMENT_INCIDENT_STATUS } from '../src/constants/postPaymentIncidentStatus.js';
import {
  canOrderProceedToFulfillment,
  FULFILLMENT_GATE_DENIAL,
} from '../src/lib/phase1FulfillmentPaymentGate.js';
import { assertPhase1FulfillmentQueuePreconditions } from '../src/domain/orders/phase1TransactionStateMachine.js';
import { canPhase1OrderLifecycleTransition } from '../src/domain/orders/phase1TransactionStateMachine.js';
import { normalizeFulfillmentProviderResult } from '../src/domain/fulfillment/providerResultNormalization.js';
import { AIRTIME_OUTCOME } from '../src/domain/fulfillment/airtimeFulfillmentResult.js';
import {
  assertEligibleForInitialDispatch,
  assertEligibleForRetryDispatch,
} from '../src/services/topupFulfillment/fulfillmentEligibility.js';
import {
  FULFILLMENT_STATUS,
  PAYMENT_STATUS,
} from '../src/domain/topupOrder/statuses.js';
import { FULFILLMENT_DB_ERROR } from '../src/domain/topupOrder/fulfillmentErrors.js';
import { validateLayer3WebPaidTransition } from '../src/payment/paymentStateMachine.js';

const paidReadyRow = {
  productType: 'mobile_topup',
  currency: 'usd',
  amountUsdCents: 1000,
  orderStatus: ORDER_STATUS.PAID,
  status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
  stripePaymentIntentId: 'pi_testfulfill123',
  completedByWebhookEventId: 'evt_testfulfill123',
  postPaymentIncidentStatus: null,
};

describe('Fulfillment failure safety audit (Phase 7 anchors)', () => {
  it('1: unpaid Phase1 order cannot pass fulfillment queue preconditions', () => {
    const r = assertPhase1FulfillmentQueuePreconditions({
      ...paidReadyRow,
      orderStatus: ORDER_STATUS.PENDING,
      status: PAYMENT_CHECKOUT_STATUS.PAYMENT_PENDING,
    });
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'order_not_paid');
  });

  it('2: paid + server-confirmed payment passes gate and queue preconditions', () => {
    assert.equal(assertPhase1FulfillmentQueuePreconditions(paidReadyRow).ok, true);
    assert.equal(canOrderProceedToFulfillment(paidReadyRow).ok, true);
  });

  it('3: order lifecycle allows PAID → PROCESSING (worker claim shape)', () => {
    assert.equal(
      canPhase1OrderLifecycleTransition(ORDER_STATUS.PAID, ORDER_STATUS.PROCESSING),
      true,
    );
  });

  it('4: malformed provider result is not coerced to success', () => {
    const r = normalizeFulfillmentProviderResult(null, { orderId: 'ck_testorderid12' });
    assert.notEqual(r.outcome, AIRTIME_OUTCOME.SUCCESS);
    assert.notEqual(String(r.outcome ?? '').toLowerCase(), 'success');
  });

  it('4b: unknown outcome string is stripped — not treated as success', () => {
    const r = normalizeFulfillmentProviderResult(
      { outcome: 'totally_fake_outcome', providerKey: 'mock' },
      { orderId: 'ck_testorderid34' },
    );
    assert.equal(r.outcome, undefined);
  });

  it('5: webtopup duplicate initial dispatch blocked when already queued', () => {
    const r = assertEligibleForInitialDispatch({
      paymentStatus: PAYMENT_STATUS.PAID,
      fulfillmentStatus: FULFILLMENT_STATUS.QUEUED,
    });
    assert.equal(r.ok, false);
  });

  it('6: refunded incident blocks Phase1 fulfillment gate', () => {
    const r = canOrderProceedToFulfillment({
      ...paidReadyRow,
      postPaymentIncidentStatus: POST_PAYMENT_INCIDENT_STATUS.REFUNDED,
    });
    assert.equal(r.ok, false);
    assert.equal(r.denial, FULFILLMENT_GATE_DENIAL.POST_PAYMENT_INCIDENT_BLOCKS);
  });

  it('7: L3 paid transition denied when row is logically REFUNDED (incident precedence)', () => {
    const r = validateLayer3WebPaidTransition({
      ...paidReadyRow,
      postPaymentIncidentStatus: POST_PAYMENT_INCIDENT_STATUS.REFUNDED,
    });
    assert.equal(r.ok, false);
  });

  it('8: provider timeout / retryable semantics exist for webtopup retry path', () => {
    const r = assertEligibleForRetryDispatch({
      paymentStatus: PAYMENT_STATUS.PAID,
      fulfillmentStatus: FULFILLMENT_STATUS.FAILED,
      fulfillmentErrorCode: 'provider_timeout',
    });
    assert.equal(r.ok, true);
  });

  it('9: normalization logs use orderIdSuffix only (no raw secrets field)', () => {
    const r = normalizeFulfillmentProviderResult(
      { outcome: AIRTIME_OUTCOME.FAILURE, providerKey: 'mock' },
      { orderId: 'ck_longprefix_secret_should_not_appear' },
    );
    assert.equal(r.outcome, AIRTIME_OUTCOME.FAILURE);
    assert.ok(!JSON.stringify(r).includes('secret'));
  });

  it('10: missing payment correlation fails gate even if order says PAID', () => {
    const r = canOrderProceedToFulfillment({
      ...paidReadyRow,
      stripePaymentIntentId: null,
      completedByWebhookEventId: null,
    });
    assert.equal(r.ok, false);
    assert.equal(r.denial, FULFILLMENT_GATE_DENIAL.MISSING_PAYMENT_CORRELATION);
  });

  it('10b: terminal webtopup failure is not eligible for unsafe auto-retry', () => {
    const r = assertEligibleForRetryDispatch({
      paymentStatus: PAYMENT_STATUS.PAID,
      fulfillmentStatus: FULFILLMENT_STATUS.FAILED,
      fulfillmentErrorCode: FULFILLMENT_DB_ERROR.TERMINAL,
    });
    assert.equal(r.ok, false);
  });
});
