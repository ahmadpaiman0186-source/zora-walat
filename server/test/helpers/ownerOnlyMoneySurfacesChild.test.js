/**
 * OWNER_ALLOWED_EMAIL must be set before env import (parent spawns this process).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';

import { AUTH_ERROR_CODE } from '../../src/constants/authErrors.js';

const { createApp } = await import('../../src/app.js');

const app = createApp();
const idem = '11111111-1111-4111-8111-111111111111';

describe('owner-only money-adjacency surfaces (child)', () => {
  it('POST /create-payment-intent without Bearer returns 401', async () => {
    const res = await request(app)
      .post('/create-payment-intent')
      .set('Content-Type', 'application/json')
      .set('Idempotency-Key', idem)
      .send({ amount: 500 });
    assert.equal(res.status, 401);
    assert.equal(res.body?.code, AUTH_ERROR_CODE.AUTH_REQUIRED);
  });

  it('POST /api/topup-orders without Bearer returns 401', async () => {
    const res = await request(app)
      .post('/api/topup-orders')
      .set('Content-Type', 'application/json')
      .set('Idempotency-Key', idem)
      .send({
        originCountry: 'US',
        destinationCountry: 'AF',
        productType: 'airtime',
        operatorKey: 'test',
        operatorLabel: 'Test Op',
        phoneNumber: '93701234567',
        productId: 'prod_test',
        productName: 'Test',
        selectedAmountLabel: '$10',
        amountCents: 1000,
        currency: 'usd',
      });
    assert.equal(res.status, 401);
    assert.equal(res.body?.code, AUTH_ERROR_CODE.AUTH_REQUIRED);
  });
});
