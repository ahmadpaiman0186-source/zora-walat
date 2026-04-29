import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { restrictedSanctionedAlpha2Probe } from '../src/policy/restrictedRegions.js';

describe('blockRestrictedCountries', () => {
  const app = createApp();

  it('returns 403 when senderCountry matches sanctioned alpha-2 probe (pricing quote)', async () => {
    const res = await request(app)
      .post('/api/checkout-pricing-quote')
      .set('Content-Type', 'application/json')
      .send({
        senderCountry: restrictedSanctionedAlpha2Probe(),
        amountUsdCents: 200,
        currency: 'usd',
      });
    assert.equal(res.status, 403);
    assert.equal(res.body?.error, 'restricted_region');
    assert.match(String(res.body?.message ?? ''), /not available/i);
  });

  it('does not return 403 for supported senderCountry (may be 400 from pricing/schema)', async () => {
    const res = await request(app)
      .post('/api/checkout-pricing-quote')
      .set('Content-Type', 'application/json')
      .send({
        senderCountry: 'US',
        amountUsdCents: 200,
        currency: 'usd',
      });
    assert.notEqual(res.status, 403);
  });
});
