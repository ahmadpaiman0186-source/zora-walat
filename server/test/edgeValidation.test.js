import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';

import { createApp } from '../src/app.js';

describe('Layer 1 edge validation (checkout-pricing-quote)', () => {
  const app = createApp();

  const baseValid = {
    senderCountry: 'US',
    currency: 'usd',
    amountUsdCents: 500,
    operatorKey: 'roshan',
    recipientPhone: '0701234567',
  };

  it('returns 400 EDGE_VALIDATION_FAILED when amount and packageId are missing', async () => {
    const res = await request(app)
      .post('/api/checkout-pricing-quote')
      .set('Content-Type', 'application/json')
      .send({
        senderCountry: 'US',
        currency: 'usd',
        operatorKey: 'roshan',
        recipientPhone: '0701234567',
      });
    assert.equal(res.status, 400);
    assert.equal(res.body?.error, 'invalid_request');
    assert.equal(res.body?.code, 'EDGE_VALIDATION_FAILED');
    assert.ok(Array.isArray(res.body?.details));
  });

  it('returns 400 when amountUsdCents is negative', async () => {
    const res = await request(app)
      .post('/api/checkout-pricing-quote')
      .set('Content-Type', 'application/json')
      .send({
        ...baseValid,
        amountUsdCents: -1,
      });
    assert.equal(res.status, 400);
    assert.equal(res.body?.code, 'EDGE_VALIDATION_FAILED');
  });

  it('returns 400 when recipientPhone is not digits-only', async () => {
    const res = await request(app)
      .post('/api/checkout-pricing-quote')
      .set('Content-Type', 'application/json')
      .send({
        ...baseValid,
        recipientPhone: '070 123 4567',
      });
    assert.equal(res.status, 400);
    assert.equal(res.body?.code, 'EDGE_VALIDATION_FAILED');
  });

  it('returns 200 with pricing breakdown for a valid ladder request', async () => {
    const res = await request(app)
      .post('/api/checkout-pricing-quote')
      .set('Content-Type', 'application/json')
      .send(baseValid);
    assert.equal(res.status, 200);
    assert.equal(typeof res.body?.pricingBreakdown?.totalUsdCents, 'number');
  });
});
