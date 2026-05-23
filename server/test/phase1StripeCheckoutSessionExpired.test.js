import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isHostedCheckoutSessionExpiredEvent,
} from '../src/services/phase1StripeCheckoutSessionExpired.js';

describe('phase1StripeCheckoutSessionExpired', () => {
  it('isHostedCheckoutSessionExpiredEvent requires checkout.session.expired + internalCheckoutId', () => {
    assert.equal(
      isHostedCheckoutSessionExpiredEvent({
        type: 'checkout.session.expired',
        data: {
          object: {
            metadata: { internalCheckoutId: 'cmp91xbrt0003jm04m9ub8wrw' },
          },
        },
      }),
      true,
    );
    assert.equal(
      isHostedCheckoutSessionExpiredEvent({
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { internalCheckoutId: 'cmp91xbrt0003jm04m9ub8wrw' },
          },
        },
      }),
      false,
    );
    assert.equal(
      isHostedCheckoutSessionExpiredEvent({
        type: 'checkout.session.expired',
        data: { object: { metadata: {} } },
      }),
      false,
    );
  });
});
