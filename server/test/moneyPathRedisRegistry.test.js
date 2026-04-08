import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { setStripeWebhookEventShadowAck } from '../src/services/moneyPathRedisRegistry.js';

describe('moneyPathRedisRegistry (Stripe shadow)', () => {
  it('reject empty event id for shadow set', async () => {
    const r = await setStripeWebhookEventShadowAck('');
    assert.equal(r.ok, false);
  });
});
