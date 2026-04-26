import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  fallbackSyntheticStripeEventId,
} from '../src/services/topupOrder/webtopupStripeFallbackPoller.js';

describe('fallbackSyntheticStripeEventId', () => {
  it('is stable per payment intent id', () => {
    const a = fallbackSyntheticStripeEventId('pi_test_123');
    const b = fallbackSyntheticStripeEventId('pi_test_123');
    assert.equal(a, b);
    assert.ok(a.startsWith('evt_zw_fallback_'));
  });
});
