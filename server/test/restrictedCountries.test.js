import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';

import { createApp } from '../src/app.js';
import {
  restrictedComplianceDialPrefixProbe,
  restrictedSanctionedAlpha2Probe,
} from '../src/policy/restrictedRegions.js';

describe('blockRestrictedCountries', () => {
  const app = createApp();

  const quoteBodyBase = {
    currency: 'usd',
    amountUsdCents: 200,
    operatorKey: 'roshan',
    recipientPhone: '0701234567',
  };

  it('returns 403 when senderCountry matches sanctioned alpha-2 probe (pricing quote)', async () => {
    const res = await request(app)
      .post('/api/checkout-pricing-quote')
      .set('Content-Type', 'application/json')
      .send({
        ...quoteBodyBase,
        senderCountry: restrictedSanctionedAlpha2Probe(),
      });
    assert.equal(res.status, 403);
    assert.equal(res.body?.error, 'restricted_region');
    assert.match(String(res.body?.message ?? ''), /not available/i);
  });

  it('returns 403 when destinationCountry matches sanctioned alpha-2 probe', async () => {
    const res = await request(app)
      .post('/api/checkout-pricing-quote')
      .set('Content-Type', 'application/json')
      .send({
        ...quoteBodyBase,
        senderCountry: 'US',
        destinationCountry: restrictedSanctionedAlpha2Probe(),
      });
    assert.equal(res.status, 403);
    assert.equal(res.body?.error, 'restricted_region');
  });

  it('returns 403 when recipientPhone indicates blocked compliance dialing', async () => {
    const res = await request(app)
      .post('/api/checkout-pricing-quote')
      .set('Content-Type', 'application/json')
      .send({
        ...quoteBodyBase,
        senderCountry: 'US',
        recipientPhone: restrictedComplianceDialPrefixProbe(),
      });
    assert.equal(res.status, 403);
    assert.equal(res.body?.error, 'restricted_region');
  });

  it('does not return 403 for supported senderCountry (may be 400 from pricing/schema)', async () => {
    const res = await request(app)
      .post('/api/checkout-pricing-quote')
      .set('Content-Type', 'application/json')
      .send({
        ...quoteBodyBase,
        senderCountry: 'US',
      });
    assert.notEqual(res.status, 403);
  });
});

