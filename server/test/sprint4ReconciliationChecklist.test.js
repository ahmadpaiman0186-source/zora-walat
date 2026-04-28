import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildSupportCorrelationChecklist } from '../src/lib/phase1SupportHints.js';

describe('Sprint 4 — support correlation checklist (unit)', () => {
  it('binds checkout, PaymentIntent, and completing webhook event for traceability', () => {
    const c = buildSupportCorrelationChecklist({
      checkoutId: 'chk_proof_01',
      stripePaymentIntentId: 'pi_proof',
      stripeCheckoutSessionId: 'cs_proof',
      completedByStripeWebhookEventId: 'evt_proof',
    });
    assert.equal(c.stripeObjects.paymentIntentId, 'pi_proof');
    assert.equal(c.stripeObjects.checkoutSessionId, 'cs_proof');
    assert.equal(c.stripeObjects.webhookEventIdThatCompleted, 'evt_proof');
    assert.match(String(c.apiStaffSupportFullTrace), /chk_proof_01/);
    assert.equal(c.fulfillmentExecutionTruth?.schemaVersion, 1);
    assert.ok(String(c.fulfillmentExecutionTruth?.primaryLinkage).includes('PaymentCheckout'));
    assert.equal(c.providerExecutionEvidence?.schemaVersion, 1);
  });
});
