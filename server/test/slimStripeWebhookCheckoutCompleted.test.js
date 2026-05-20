/**
 * Hosted checkout.session.completed slim classifier.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isHostedCheckoutSessionCompletedEvent } from '../api/slimStripeWebhookCheckoutCompleted.mjs';

describe('isHostedCheckoutSessionCompletedEvent', () => {
  it('returns true when internalCheckoutId is a valid checkout id', () => {
    const ev = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_abc',
          metadata: { internalCheckoutId: 'cmp91xbrt0003jm04m9ub8wrw' },
        },
      },
    };
    assert.equal(isHostedCheckoutSessionCompletedEvent(ev), true);
  });

  it('returns false when metadata is missing', () => {
    const ev = {
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_abc', metadata: {} } },
    };
    assert.equal(isHostedCheckoutSessionCompletedEvent(ev), false);
  });
});
