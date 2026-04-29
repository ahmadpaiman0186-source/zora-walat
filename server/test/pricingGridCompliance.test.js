import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';

import { createApp } from '../src/app.js';

describe('Phase 1 USD pricing ladder enforcement', () => {
  const app = createApp();

  const validPayload = {
    senderCountry: 'US',
    currency: 'usd',
    amountUsdCents: 500,
    operatorKey: 'roshan',
    recipientPhone: '0701234567',
  };

  it('returns 400 invalid_amount for amounts not on Phase 1 ladder', async () => {
    const res = await request(app)
      .post('/api/checkout-pricing-quote')
      .set('Content-Type', 'application/json')
      .send({
        ...validPayload,
        amountUsdCents: 100,
      });
    assert.equal(res.status, 400);
    assert.equal(res.body?.code, 'invalid_amount');
  });

  it('accepts ladder amount (HTTP 200 breakdown)', async () => {
    const res = await request(app)
      .post('/api/checkout-pricing-quote')
      .set('Content-Type', 'application/json')
      .send(validPayload);
    assert.equal(res.status, 200);
    assert.equal(typeof res.body?.pricingBreakdown?.totalUsdCents, 'number');
  });
});
