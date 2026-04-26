import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  evaluateStripeCheckoutSessionRowIntegrity,
  buildPhase1PaymentCompletionTruthBlock,
} from '../src/lib/paymentCompletionLinkage.js';

describe('evaluateStripeCheckoutSessionRowIntegrity', () => {
  it('passes when DB session id matches webhook', () => {
    const r = evaluateStripeCheckoutSessionRowIntegrity(
      { stripeCheckoutSessionId: 'cs_a' },
      { id: 'cs_a' },
    );
    assert.equal(r.ok, true);
    assert.equal(r.stripeSessionId, 'cs_a');
  });

  it('passes when DB session id is null (backfill path)', () => {
    const r = evaluateStripeCheckoutSessionRowIntegrity(
      { stripeCheckoutSessionId: null },
      { id: 'cs_new' },
    );
    assert.equal(r.ok, true);
    assert.equal(r.stripeSessionId, 'cs_new');
  });

  it('fails when persisted session id differs from webhook', () => {
    const r = evaluateStripeCheckoutSessionRowIntegrity(
      { stripeCheckoutSessionId: 'cs_expected' },
      { id: 'cs_other' },
    );
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'stripe_checkout_session_id_mismatch');
    assert.equal(r.securityEvent, 'webhook_stripe_session_mismatch');
  });

  it('fails when webhook session id missing', () => {
    const r = evaluateStripeCheckoutSessionRowIntegrity({ stripeCheckoutSessionId: 'cs_x' }, {});
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'missing_stripe_checkout_session_id');
  });
});

describe('buildPhase1PaymentCompletionTruthBlock', () => {
  it('returns stable schema for support DTO', () => {
    const b = buildPhase1PaymentCompletionTruthBlock();
    assert.equal(b.schemaVersion, 1);
    assert.equal(b.authoritativeStripeEventType, 'checkout.session.completed');
    assert.ok(Array.isArray(b.dbFieldsProvingCompletion));
    assert.ok(b.sessionRowIntegrity.length > 10);
  });
});
