import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ORDER_STATUS } from '../src/constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../src/constants/paymentCheckoutStatus.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../src/constants/fulfillmentAttemptStatus.js';
import { buildPhase1MoneyTruthSnapshot } from '../src/domain/reconciliation/phase1MoneyTruthReconciliation.js';

function order(overrides = {}) {
  return {
    stripePaymentIntentId: 'pi_ok',
    completedByWebhookEventId: null,
    orderStatus: ORDER_STATUS.PAID,
    status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
    ...overrides,
  };
}

describe('phase1MoneyTruthReconciliation', () => {
  it('reports aligned for minimal consistent snapshot', () => {
    const s = buildPhase1MoneyTruthSnapshot(
      order(),
      [{ status: FULFILLMENT_ATTEMPT_STATUS.QUEUED, attemptNumber: 1 }],
    );
    assert.equal(s.aligned, true);
    assert.equal(s.driftCodes.length, 0);
  });

  it('drifts when paid-like but no pi or completion evt', () => {
    const s = buildPhase1MoneyTruthSnapshot(
      order({
        stripePaymentIntentId: null,
        completedByWebhookEventId: null,
      }),
      [],
    );
    assert.equal(s.aligned, false);
    assert.ok(s.driftCodes.includes('paid_like_without_pi_or_completion_evt'));
  });

  it('drifts when order PAID but payment row not succeeded', () => {
    const s = buildPhase1MoneyTruthSnapshot(
      order({ status: PAYMENT_CHECKOUT_STATUS.CHECKOUT_CREATED }),
      [],
    );
    assert.equal(s.aligned, false);
    assert.ok(s.driftCodes.includes('order_paid_payment_row_not_succeeded'));
  });

  it('drifts when FULFILLED but no succeeded attempt', () => {
    const s = buildPhase1MoneyTruthSnapshot(
      order({ orderStatus: ORDER_STATUS.FULFILLED }),
      [{ status: FULFILLMENT_ATTEMPT_STATUS.FAILED, attemptNumber: 1 }],
    );
    assert.equal(s.aligned, false);
    assert.ok(s.driftCodes.includes('order_fulfilled_without_succeeded_attempt'));
  });

  it('flags stripe truth mismatch when provided', () => {
    const s = buildPhase1MoneyTruthSnapshot(order(), [], {
      paymentIntentIdMatchesCheckout: false,
    });
    assert.equal(s.aligned, false);
    assert.ok(s.driftCodes.includes('stripe_pi_mismatch'));
  });
});
