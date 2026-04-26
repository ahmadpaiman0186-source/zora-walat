/**
 * Guards against mistaking CI synthetic `sk_test_…` keys for Dashboard keys in `proof:sprint5:stripe-api`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { looksLikeSprint4CiPlaceholderStripeKey } from '../scripts/stripe-test-mode-api-proof.mjs';

describe('stripe-test-mode-api-proof placeholder guard', () => {
  it('detects sprint4PaymentLoopEnv synthetic key pattern', () => {
    assert.equal(looksLikeSprint4CiPlaceholderStripeKey(`sk_test_${'b'.repeat(100)}`), true);
  });

  it('does not reject short or mixed suffix keys', () => {
    assert.equal(looksLikeSprint4CiPlaceholderStripeKey('sk_test_1234567890abcdef'), false);
    assert.equal(looksLikeSprint4CiPlaceholderStripeKey('sk_live_xxxxxxxx'), false);
  });
});
