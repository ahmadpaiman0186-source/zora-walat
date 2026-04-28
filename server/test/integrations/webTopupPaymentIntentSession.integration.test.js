/**
 * Web top-up: PaymentIntent must be bound to order session when `orderId` is sent.
 * Requires PostgreSQL (`DATABASE_URL` / preload). Does not require Stripe for the 403 path.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import request from 'supertest';

import { WEBTOPUP_CLIENT_ERROR_CODE } from '../../src/constants/webtopupClientErrors.js';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';

if (process.env.CI === 'true' && !process.env.TEST_DATABASE_URL) {
  throw new Error(
    'CI requires TEST_DATABASE_URL for web top-up PaymentIntent session tests',
  );
}

const dbUrl = String(process.env.DATABASE_URL ?? '').trim();
const runIntegration = Boolean(dbUrl);

function topupBody() {
  const suffix = randomUUID()
    .replace(/\D/g, '')
    .padEnd(6, '0')
    .slice(0, 6);
  return {
    originCountry: 'US',
    destinationCountry: 'AF',
    productType: 'airtime',
    operatorKey: 'mtn_af',
    operatorLabel: 'MTN',
    phoneNumber: `7012345${suffix}`.slice(0, 15),
    productId: 'pkg_smoke',
    productName: 'Smoke',
    selectedAmountLabel: '$5',
    amountCents: 500,
    currency: 'usd',
  };
}

describe(
  'web top-up PaymentIntent session binding (integration)',
  { skip: !runIntegration },
  () => {
    /** @type {import('express').Express} */
    let app;
    const originalPrelaunch = env.prelaunchLockdown;

    before(() => {
      env.prelaunchLockdown = false;
      app = createApp();
    });

    after(() => {
      env.prelaunchLockdown = originalPrelaunch;
    });

    it('returns 403 when orderId is set but X-ZW-WebTopup-Session does not match', async () => {
      const idem = randomUUID();
      const create = await request(app)
        .post('/api/topup-orders')
        .set('Content-Type', 'application/json')
        .set('Idempotency-Key', idem)
        .send(topupBody());

      assert.equal(create.status, 201, JSON.stringify(create.body));
      const orderId = create.body?.order?.id;
      const sessionKey = create.body?.sessionKey;
      assert.ok(typeof orderId === 'string' && orderId.length > 0);
      assert.ok(typeof sessionKey === 'string' && sessionKey.length > 0);

      const piIdem = randomUUID();
      const res = await request(app)
        .post('/create-payment-intent')
        .set('Content-Type', 'application/json')
        .set('Idempotency-Key', piIdem)
        .set('X-ZW-WebTopup-Session', randomUUID())
        .send({ amount: 500, orderId });

      assert.equal(res.status, 403);
      assert.equal(res.body?.success, false);
      assert.equal(res.body?.code, WEBTOPUP_CLIENT_ERROR_CODE.ORDER_SESSION_INVALID);
      assert.match(String(res.body?.message ?? ''), /X-ZW-WebTopup-Session/i);
    });

    it('returns 403 when orderId is set but session header is missing', async () => {
      const idem = randomUUID();
      const create = await request(app)
        .post('/api/topup-orders')
        .set('Content-Type', 'application/json')
        .set('Idempotency-Key', idem)
        .send(topupBody());

      assert.equal(create.status, 201, JSON.stringify(create.body));
      const orderId = create.body?.order?.id;
      assert.ok(typeof orderId === 'string');

      const piIdem = randomUUID();
      const res = await request(app)
        .post('/create-payment-intent')
        .set('Content-Type', 'application/json')
        .set('Idempotency-Key', piIdem)
        .send({ amount: 500, orderId });

      assert.equal(res.status, 403);
      assert.equal(res.body?.code, WEBTOPUP_CLIENT_ERROR_CODE.ORDER_SESSION_INVALID);
    });
  },
);
