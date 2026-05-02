/**
 * Phase 1 money-path state machine — unit coverage for lifecycle invariants.
 * Webhook idempotency + DB races: see test/integrations/phase1Resilience.integration.test.js,
 * transactionFortressConcurrency.integration.test.js, sprint4/5 payment loop proofs.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ORDER_STATUS } from '../src/constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../src/constants/paymentCheckoutStatus.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../src/constants/fulfillmentAttemptStatus.js';
import {
  assertTransition,
  canTransition,
  OrderTransitionError,
} from '../src/domain/orders/orderLifecycle.js';
import {
  validateOrderStatusTransition,
  validatePaymentCheckoutStatusTransition,
} from '../src/domain/orders/phase1LifecyclePolicy.js';
import {
  assertPhase1FulfillmentQueuePreconditions,
  evaluatePhase1CompoundIntegrity,
  validateFulfillmentAttemptStatusTransition,
} from '../src/domain/orders/phase1TransactionStateMachine.js';
import { deriveCanonicalOrderStatus } from '../src/domain/orders/canonicalOrderLifecycle.js';

describe('money path state machine (audit)', () => {
  it('order: invalid transitions are rejected (PAID → FULFILLED direct)', () => {
    assert.equal(canTransition(ORDER_STATUS.PAID, ORDER_STATUS.FULFILLED), false);
    assert.throws(
      () => assertTransition(ORDER_STATUS.PAID, ORDER_STATUS.FULFILLED),
      OrderTransitionError,
    );
    const v = validateOrderStatusTransition(ORDER_STATUS.PAID, ORDER_STATUS.FULFILLED);
    assert.equal(v.ok, false);
  });

  it('order: terminal rows are immutable (FULFILLED → PAID)', () => {
    const v = validateOrderStatusTransition(ORDER_STATUS.FULFILLED, ORDER_STATUS.PAID);
    assert.equal(v.ok, false);
  });

  it('payment row: invalid jump INITIATED → RECHARGE_PENDING is rejected', () => {
    const v = validatePaymentCheckoutStatusTransition(
      PAYMENT_CHECKOUT_STATUS.INITIATED,
      PAYMENT_CHECKOUT_STATUS.RECHARGE_PENDING,
    );
    assert.equal(v.ok, false);
  });

  it('payment row: happy path edges exist', () => {
    assert.ok(
      validatePaymentCheckoutStatusTransition(
        PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
        PAYMENT_CHECKOUT_STATUS.RECHARGE_PENDING,
      ).ok,
    );
    assert.ok(
      validatePaymentCheckoutStatusTransition(
        PAYMENT_CHECKOUT_STATUS.RECHARGE_PENDING,
        PAYMENT_CHECKOUT_STATUS.RECHARGE_COMPLETED,
      ).ok,
    );
  });

  it('fulfillment attempt: invalid QUEUED → SUCCEEDED is rejected', () => {
    const v = validateFulfillmentAttemptStatusTransition(
      FULFILLMENT_ATTEMPT_STATUS.QUEUED,
      FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED,
    );
    assert.equal(v.ok, false);
  });

  it('fulfillment attempt: QUEUED → PROCESSING → SUCCEEDED is valid', () => {
    assert.ok(
      validateFulfillmentAttemptStatusTransition(
        FULFILLMENT_ATTEMPT_STATUS.QUEUED,
        FULFILLMENT_ATTEMPT_STATUS.PROCESSING,
      ).ok,
    );
    assert.ok(
      validateFulfillmentAttemptStatusTransition(
        FULFILLMENT_ATTEMPT_STATUS.PROCESSING,
        FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED,
      ).ok,
    );
  });

  it('queue preconditions: PENDING order cannot queue fulfillment', () => {
    const r = assertPhase1FulfillmentQueuePreconditions({
      orderStatus: ORDER_STATUS.PENDING,
      status: PAYMENT_CHECKOUT_STATUS.CHECKOUT_CREATED,
      productType: 'mobile_topup',
      currency: 'usd',
      amountUsdCents: 500,
      stripePaymentIntentId: 'pi_test',
      completedByWebhookEventId: 'evt_test',
    });
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'order_not_paid');
  });

  it('compound integrity: flags queued fulfillment while order still PENDING', () => {
    const ev = evaluatePhase1CompoundIntegrity(
      {
        orderStatus: ORDER_STATUS.PENDING,
        status: PAYMENT_CHECKOUT_STATUS.PAYMENT_PENDING,
      },
      [{ attemptNumber: 1, status: FULFILLMENT_ATTEMPT_STATUS.QUEUED }],
    );
    assert.equal(ev.ok, false);
    assert.ok(ev.violations.includes('fulfillment_active_before_order_paid'));
  });

  it('compound integrity: PAID + PAYMENT_FAILED is flagged', () => {
    const ev = evaluatePhase1CompoundIntegrity(
      {
        orderStatus: ORDER_STATUS.PAID,
        status: PAYMENT_CHECKOUT_STATUS.PAYMENT_FAILED,
      },
      [],
    );
    assert.equal(ev.ok, false);
    assert.ok(ev.violations.includes('paid_order_with_failed_payment_row'));
  });

  it('canonical mapping: PAID + attempt QUEUED → canonical QUEUED', () => {
    assert.equal(
      deriveCanonicalOrderStatus(
        { orderStatus: ORDER_STATUS.PAID },
        { status: FULFILLMENT_ATTEMPT_STATUS.QUEUED },
      ),
      'QUEUED',
    );
  });
});
