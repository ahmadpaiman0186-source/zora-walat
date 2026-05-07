import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ORDER_STATUS } from '../src/constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../src/constants/paymentCheckoutStatus.js';
import { PAYMENT_FULFILLMENT_RECON_STATUS } from '../src/constants/paymentFulfillmentReconciliationStatus.js';
import { PROVIDER_TRUTH_STATUS } from '../src/constants/providerTruthStatus.js';
import {
  computePaymentCheckoutTrustScore,
  isTrustBlocked,
  isTrustSuspicious,
} from '../src/lib/paymentCheckoutTrust.js';

/**
 * L11: Trust scalar is deterministic from persisted payment/fulfillment/provider/recon fields.
 * High fraud risk is enforced separately by `evaluateFulfillmentMoneyGate` (fraudRiskScore), not mixed into this number.
 */
describe('paymentCheckoutTrust (L11 explainable scoring)', () => {
  const paidBase = {
    status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
    completedByWebhookEventId: 'evt_trust_test',
  };

  it('paid + non-required reconciliation → 50 (40 payment + 10 recon clear)', () => {
    const s = computePaymentCheckoutTrustScore({
      ...paidBase,
      orderStatus: ORDER_STATUS.PAID,
      providerTruthStatus: PROVIDER_TRUTH_STATUS.UNKNOWN,
      reconciliationStatus: PAYMENT_FULFILLMENT_RECON_STATUS.PENDING,
    });
    assert.equal(s, 50);
  });

  it('reconciliation REQUIRED drops recon bonus (payment + provider unknown → 40)', () => {
    const s = computePaymentCheckoutTrustScore({
      ...paidBase,
      orderStatus: ORDER_STATUS.PAID,
      providerTruthStatus: PROVIDER_TRUTH_STATUS.UNKNOWN,
      reconciliationStatus: PAYMENT_FULFILLMENT_RECON_STATUS.REQUIRED,
    });
    assert.equal(s, 40);
  });

  it('provider truth OK adds 20 when other components present', () => {
    const s = computePaymentCheckoutTrustScore({
      ...paidBase,
      orderStatus: ORDER_STATUS.PAID,
      providerTruthStatus: PROVIDER_TRUTH_STATUS.OK,
      reconciliationStatus: PAYMENT_FULFILLMENT_RECON_STATUS.OK,
    });
    assert.equal(s, 70);
  });

  it('isTrustBlocked boundary at 50', () => {
    assert.equal(isTrustBlocked(49), true);
    assert.equal(isTrustBlocked(50), false);
  });

  it('isTrustSuspicious boundary at 70', () => {
    assert.equal(isTrustSuspicious(69), true);
    assert.equal(isTrustSuspicious(70), false);
  });
});
