/**
 * Phase 2 operator harness — URL classification only (no secrets).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isStripeLiveCheckoutSessionUrl,
  isStripeTestCheckoutSessionUrl,
} from '../tools/staging-auth-checkout-operator.mjs';

describe('Stripe checkout URL classification (no URL logging in tests)', () => {
  it('detects test session paths', () => {
    assert.equal(
      isStripeTestCheckoutSessionUrl(
        'https://checkout.stripe.com/c/pay/cs_test_abc123xyz',
      ),
      true,
    );
    assert.equal(
      isStripeLiveCheckoutSessionUrl(
        'https://checkout.stripe.com/c/pay/cs_test_abc123xyz',
      ),
      false,
    );
  });

  it('detects live session paths', () => {
    assert.equal(
      isStripeLiveCheckoutSessionUrl(
        'https://checkout.stripe.com/c/pay/cs_live_abc123xyz',
      ),
      true,
    );
    assert.equal(
      isStripeTestCheckoutSessionUrl(
        'https://checkout.stripe.com/c/pay/cs_live_abc123xyz',
      ),
      false,
    );
  });
});
