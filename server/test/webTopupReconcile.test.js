import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PAYMENT_STATUS } from '../src/domain/topupOrder/statuses.js';
import { compareWebTopupOrderToStripeIntent } from '../src/services/topupOrder/webTopupReconcileService.js';

describe('compareWebTopupOrderToStripeIntent', () => {
  const baseOrder = {
    id: 'tw_ord_aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    paymentStatus: PAYMENT_STATUS.PENDING,
    amountCents: 500,
    currency: 'usd',
    paymentIntentId: 'pi_1234567890',
  };

  it('reports consistent when PI matches pending order', () => {
    const r = compareWebTopupOrderToStripeIntent(baseOrder, {
      id: 'pi_1234567890',
      status: 'requires_payment_method',
      amount: 500,
      currency: 'usd',
      metadata: {},
    });
    assert.equal(r.consistent, true);
    assert.deepEqual(r.issues, []);
  });

  it('detects amount mismatch', () => {
    const r = compareWebTopupOrderToStripeIntent(baseOrder, {
      id: 'pi_1234567890',
      status: 'succeeded',
      amount: 499,
      currency: 'usd',
      metadata: { topup_order_id: baseOrder.id },
    });
    assert.equal(r.consistent, false);
    assert.ok(r.issues.includes('amount_mismatch'));
  });

  it('detects currency mismatch', () => {
    const r = compareWebTopupOrderToStripeIntent(baseOrder, {
      id: 'pi_1234567890',
      status: 'succeeded',
      amount: 500,
      currency: 'aed',
      metadata: {},
    });
    assert.equal(r.consistent, false);
    assert.ok(r.issues.includes('currency_mismatch'));
  });

  it('detects payment_intent_mismatch', () => {
    const r = compareWebTopupOrderToStripeIntent(baseOrder, {
      id: 'pi_other',
      status: 'succeeded',
      amount: 500,
      currency: 'usd',
      metadata: {},
    });
    assert.equal(r.consistent, false);
    assert.ok(r.issues.includes('payment_intent_mismatch'));
  });

  it('detects metadata_order_mismatch', () => {
    const r = compareWebTopupOrderToStripeIntent(baseOrder, {
      id: 'pi_1234567890',
      status: 'succeeded',
      amount: 500,
      currency: 'usd',
      metadata: { topup_order_id: 'tw_ord_other' },
    });
    assert.equal(r.consistent, false);
    assert.ok(r.issues.includes('metadata_order_mismatch'));
  });

  it('flags order_pending_but_pi_succeeded', () => {
    const r = compareWebTopupOrderToStripeIntent(
      { ...baseOrder, paymentStatus: PAYMENT_STATUS.PENDING },
      {
        id: 'pi_1234567890',
        status: 'succeeded',
        amount: 500,
        currency: 'usd',
        metadata: {},
      },
    );
    assert.equal(r.consistent, false);
    assert.ok(r.issues.includes('order_pending_but_pi_succeeded'));
  });

  it('flags stripe_pi_missing when order expects PI', () => {
    const r = compareWebTopupOrderToStripeIntent(baseOrder, null);
    assert.equal(r.consistent, false);
    assert.ok(r.issues.includes('stripe_pi_missing'));
  });
});
