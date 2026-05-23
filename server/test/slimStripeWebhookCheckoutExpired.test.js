import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { describe, it } from 'node:test';

import { isHostedCheckoutSessionExpiredEvent } from '../api/slimStripeWebhookCheckoutExpired.mjs';
import { stripeEventSlimUnmatchedFastAck } from '../api/slimStripeWebhookHandler.mjs';

describe('slimStripeWebhookCheckoutExpired classifier', () => {
  const internalCheckoutId = 'cmp91xbrt0003jm04m9ub8wrw';

  it('correlated expired is not slim-unmatched (uses slim path, not Express replay)', () => {
    const event = {
      type: 'checkout.session.expired',
      data: {
        object: {
          id: `cs_${randomUUID().slice(0, 8)}`,
          metadata: { internalCheckoutId },
        },
      },
    };
    assert.equal(isHostedCheckoutSessionExpiredEvent(event), true);
    assert.equal(stripeEventSlimUnmatchedFastAck(event), false);
  });

  it('expired without internalCheckoutId remains unmatched fast-ack', () => {
    const event = {
      type: 'checkout.session.expired',
      data: { object: { id: 'cs_x', metadata: {} } },
    };
    assert.equal(isHostedCheckoutSessionExpiredEvent(event), false);
    assert.equal(stripeEventSlimUnmatchedFastAck(event), true);
  });
});
