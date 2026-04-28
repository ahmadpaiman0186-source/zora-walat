import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ORDER_STATUS } from '../src/constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../src/constants/paymentCheckoutStatus.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../src/constants/fulfillmentAttemptStatus.js';
import {
  assertPhase1FulfillmentQueuePreconditions,
  assertPhase1OrderLifecycleTransition,
  canPhase1OrderLifecycleTransition,
  canPhase1PaymentRowTransition,
  evaluatePhase1CompoundIntegrity,
  listPhase1OrderLifecycleEdges,
} from '../src/domain/orders/phase1TransactionStateMachine.js';
import { OrderTransitionError } from '../src/domain/orders/orderLifecycle.js';
import { transientRetryHintFromProviderResult } from '../src/domain/fulfillment/retryPolicy.js';
import { AIRTIME_ERROR_KIND, AIRTIME_OUTCOME } from '../src/domain/fulfillment/airtimeFulfillmentResult.js';

function baseOrder(overrides = {}) {
  return {
    id: 'ord_1',
    productType: 'mobile_topup',
    currency: 'usd',
    amountUsdCents: 1000,
    status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
    orderStatus: ORDER_STATUS.PAID,
    stripePaymentIntentId: 'pi_test_123',
    completedByWebhookEventId: null,
    postPaymentIncidentStatus: null,
    ...overrides,
  };
}

describe('phase1TransactionStateMachine', () => {
  it('lists order lifecycle edges for documentation', () => {
    const e = listPhase1OrderLifecycleEdges();
    assert.ok(e.some((x) => x.includes('PENDING')));
  });

  it('allows PENDING → PAID and rejects PENDING → PROCESSING', () => {
    assert.doesNotThrow(() =>
      assertPhase1OrderLifecycleTransition(ORDER_STATUS.PENDING, ORDER_STATUS.PAID),
    );
    assert.equal(
      canPhase1OrderLifecycleTransition(ORDER_STATUS.PENDING, ORDER_STATUS.PROCESSING),
      false,
    );
  });

  it('rejects same from/to in assertPhase1OrderLifecycleTransition', () => {
    assert.throws(
      () => assertPhase1OrderLifecycleTransition(ORDER_STATUS.PAID, ORDER_STATUS.PAID),
      OrderTransitionError,
    );
  });

  it('fulfillment queue preconditions pass only for PAID + server-confirmed payment', () => {
    assert.equal(assertPhase1FulfillmentQueuePreconditions(baseOrder()).ok, true);
    assert.equal(
      assertPhase1FulfillmentQueuePreconditions(
        baseOrder({ orderStatus: ORDER_STATUS.PENDING }),
      ).ok,
      false,
    );
    assert.equal(
      assertPhase1FulfillmentQueuePreconditions(
        baseOrder({ status: PAYMENT_CHECKOUT_STATUS.CHECKOUT_CREATED }),
      ).ok,
      false,
    );
  });

  it('payment row transition helper matches phase1 policy', () => {
    assert.equal(
      canPhase1PaymentRowTransition(
        PAYMENT_CHECKOUT_STATUS.INITIATED,
        PAYMENT_CHECKOUT_STATUS.CHECKOUT_CREATED,
      ),
      true,
    );
    assert.equal(
      canPhase1PaymentRowTransition(
        PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
        PAYMENT_CHECKOUT_STATUS.INITIATED,
      ),
      false,
    );
  });

  it('detects impossible compound: queued attempt while order PENDING', () => {
    const r = evaluatePhase1CompoundIntegrity(
      baseOrder({ orderStatus: ORDER_STATUS.PENDING, status: PAYMENT_CHECKOUT_STATUS.INITIATED }),
      [{ attemptNumber: 1, status: FULFILLMENT_ATTEMPT_STATUS.QUEUED }],
    );
    assert.equal(r.ok, false);
    assert.ok(r.violations.includes('fulfillment_active_before_order_paid'));
  });

  it('allows consistent PAID + succeeded + queued attempt', () => {
    const r = evaluatePhase1CompoundIntegrity(
      baseOrder(),
      [{ attemptNumber: 1, status: FULFILLMENT_ATTEMPT_STATUS.QUEUED }],
    );
    assert.equal(r.ok, true);
  });

  it('transientRetryHintFromProviderResult marks network failures retry-shaped', () => {
    const hint = transientRetryHintFromProviderResult({
      outcome: AIRTIME_OUTCOME.FAILURE,
      errorKind: AIRTIME_ERROR_KIND.NETWORK,
    });
    assert.equal(hint.transientEligible, true);
    assert.equal(hint.autoRetryEnabled, false);
  });
});
