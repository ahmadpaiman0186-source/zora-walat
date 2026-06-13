/**
 * Phase 6 — order / payment state safety audit anchors (no DB fixtures).
 * Complements integration suites: stripeWebhookHttpChaos, phase1TransactionStateMachine, slimStripeWebhookEntrypoint.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { describe, it } from 'node:test';

import { ORDER_STATUS } from '../src/constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../src/constants/paymentCheckoutStatus.js';
import { POST_PAYMENT_INCIDENT_STATUS } from '../src/constants/postPaymentIncidentStatus.js';
import {
  canOrderProceedToFulfillment,
  FULFILLMENT_GATE_DENIAL,
} from '../src/lib/phase1FulfillmentPaymentGate.js';
import {
  assertValidTransition,
  PAYMENT_CORE_STATE,
  validateLayer3WebPaidTransition,
} from '../src/payment/paymentStateMachine.js';
import { paymentCheckoutPendingForPhase1CheckoutSessionPaidReplay } from '../src/services/phase1StripeCheckoutSessionCompleted.js';
import { stripeEventSlimUnmatchedFastAck } from '../handlers/slimStripeWebhookHandler.mjs';
import { isAllowedWebTopupPaymentTransition } from '../src/domain/topupOrder/webtopupStateMachine.js';
import { PAYMENT_STATUS } from '../src/domain/topupOrder/statuses.js';
import { canTransition } from '../src/domain/orders/orderLifecycle.js';

describe('Order state safety audit (Phase 6 anchors)', () => {
  it('1–2: new checkout API row starts unpaid; API cannot authorize L3 → PAID', () => {
    assert.notEqual(
      PAYMENT_CHECKOUT_STATUS.INITIATED,
      PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
      'INITIATED must differ from PAYMENT_SUCCEEDED (POST must not imply paid)',
    );
    const apiPaid = assertValidTransition(PAYMENT_CORE_STATE.PAYMENT_PENDING, PAYMENT_CORE_STATE.PAID, {
      authority: 'api',
    });
    assert.equal(apiPaid.ok, false);
    assert.equal(apiPaid.reason, 'paid_requires_stripe_webhook_authority');
  });

  it('3: replay helper: CHECKOUT_CREATED + PENDING + userId eligible for paid replay path', () => {
    const ok = paymentCheckoutPendingForPhase1CheckoutSessionPaidReplay({
      userId: 'usr_test',
      orderStatus: ORDER_STATUS.PENDING,
      status: PAYMENT_CHECKOUT_STATUS.CHECKOUT_CREATED,
    });
    assert.equal(ok, true);
  });

  it('4: L3 duplicate paid transition is rejected (no silent double-PAID at core layer)', () => {
    const row = {
      orderStatus: ORDER_STATUS.PAID,
      status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
      postPaymentIncidentStatus: null,
    };
    const r = validateLayer3WebPaidTransition(row);
    assert.equal(r.ok, false);
  });

  it('5: slim path: fixture-shaped payment_intent.succeeded (no Zora source) fast-acks unmatched', () => {
    const ev = {
      type: 'payment_intent.succeeded',
      data: {
        object: {
          object: 'payment_intent',
          metadata: { topup_order_id: `tw_ord_${randomUUID()}` },
        },
      },
    };
    assert.equal(stripeEventSlimUnmatchedFastAck(ev), true);
  });

  it('6: webtopup payment machine allows PENDING → FAILED', () => {
    assert.equal(
      isAllowedWebTopupPaymentTransition(PAYMENT_STATUS.PENDING, PAYMENT_STATUS.FAILED),
      true,
    );
  });

  it('7: fulfillment gate blocks when post-payment incident is REFUNDED', () => {
    const r = canOrderProceedToFulfillment({
      productType: 'mobile_topup',
      currency: 'usd',
      amountUsdCents: 1000,
      orderStatus: ORDER_STATUS.PAID,
      status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
      stripePaymentIntentId: 'pi_test123456789',
      completedByWebhookEventId: 'evt_test123456',
      postPaymentIncidentStatus: POST_PAYMENT_INCIDENT_STATUS.REFUNDED,
    });
    assert.equal(r.ok, false);
    assert.equal(r.denial, FULFILLMENT_GATE_DENIAL.POST_PAYMENT_INCIDENT_BLOCKS);
  });

  it('8: fulfillment gate rejects PENDING order even if payment status were wrong-invariant', () => {
    const r = canOrderProceedToFulfillment({
      productType: 'mobile_topup',
      currency: 'usd',
      amountUsdCents: 500,
      orderStatus: ORDER_STATUS.PENDING,
      status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
      stripePaymentIntentId: 'pi_abcd1234',
      completedByWebhookEventId: 'evt_abcd1234',
    });
    assert.equal(r.ok, false);
    assert.equal(r.denial, FULFILLMENT_GATE_DENIAL.ORDER_LIFECYCLE_NOT_ELIGIBLE);
  });

  it('8b: fulfillment gate rejects unpaid server payment state', () => {
    const r = canOrderProceedToFulfillment({
      productType: 'mobile_topup',
      currency: 'usd',
      amountUsdCents: 500,
      orderStatus: ORDER_STATUS.PAID,
      status: PAYMENT_CHECKOUT_STATUS.PAYMENT_PENDING,
      stripePaymentIntentId: 'pi_abcd1234',
      completedByWebhookEventId: 'evt_abcd1234',
    });
    assert.equal(r.ok, false);
    assert.equal(r.denial, FULFILLMENT_GATE_DENIAL.PAYMENT_NOT_SERVER_CONFIRMED);
  });

  it('9: order lifecycle: no direct PENDING → FULFILLED (provider cannot skip paid)', () => {
    assert.equal(canTransition(ORDER_STATUS.PENDING, ORDER_STATUS.FULFILLED), false);
  });

  it('10: invalid signature path is covered by stripeWebhookSignatureRejection.test.js (HTTP 400)', () => {
    assert.ok(true);
  });
});
