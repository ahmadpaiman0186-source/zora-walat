/**
 * Slim charge.refunded webhook classifier (no DB).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isChargeRefundedEvent,
} from '../api/slimStripeWebhookChargeRefunded.mjs';
import { stripePaymentIntentIdFromObject } from '../src/services/phase1StripeChargeIncidents.js';

describe('slimStripeWebhookChargeRefunded', () => {
  it('detects charge.refunded events', () => {
    assert.equal(
      isChargeRefundedEvent({ type: 'charge.refunded', data: { object: {} } }),
      true,
    );
    assert.equal(isChargeRefundedEvent({ type: 'charge.succeeded' }), false);
  });

  it('extracts payment_intent id suffix-safe from charge object', () => {
    const pi = 'pi_test_suffix_only_01';
    const id = stripePaymentIntentIdFromObject({
      payment_intent: pi,
      id: 'ch_test_charge_suffix_01',
    });
    assert.equal(id, pi);
    assert.equal(id?.startsWith('pi_'), true);
  });
});
