import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ORDER_STATUS } from '../src/constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../src/constants/paymentCheckoutStatus.js';
import { buildFulfillmentExecutionTruthBlock } from '../src/lib/fulfillmentExecutionTruth.js';
import { buildPhase1ReconciliationHints } from '../src/lib/phase1ReconciliationHints.js';

describe('buildFulfillmentExecutionTruthBlock', () => {
  it('exposes stable schema and single-attempt semantics', () => {
    const b = buildFulfillmentExecutionTruthBlock();
    assert.equal(b.schemaVersion, 1);
    assert.ok(String(b.primaryLinkage).includes('PaymentCheckout'));
    assert.equal(b.initialAttempt.attemptNumber, 1);
    assert.ok(b.duplicatePaymentWebhookSafety.length > 10);
    assert.ok(b.workerClaimSemantics.length > 10);
    assert.ok(String(b.inquiryBeforePost ?? '').includes('reloadlyCustomIdentifier'));
  });
});

describe('reconciliation hints — fulfillment linkage evidence', () => {
  it('includes explicit FK linkage string for operators', () => {
    const hints = buildPhase1ReconciliationHints(
      {
        id: 'ck_test',
        status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
        orderStatus: ORDER_STATUS.PAID,
        metadata: null,
        paidAt: new Date(),
        failureReason: null,
        stripePaymentIntentId: 'pi_x',
        completedByWebhookEventId: 'evt_x',
        fulfillmentProviderReference: null,
        fulfillmentProviderKey: null,
      },
      [],
    );
    assert.ok(
      String(hints.evidence.fulfillmentAttemptOrderLinkage).includes('PaymentCheckout'),
    );
  });
});
