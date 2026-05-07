/**
 * Layer 2 money-path identity guard — HTTP smoke + middleware contract.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';
import Stripe from 'stripe';
import { randomUUID } from 'node:crypto';

import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { isDevCheckoutAuthBypassRuntimeConfigured } from '../src/lib/devCheckoutAuthBypassRuntime.js';
import { requireMoneyPathIdentity } from '../src/middleware/requireMoneyPathIdentity.js';

describe('requireMoneyPathIdentity middleware', () => {
  it('rejects untrusted identity for strict_authenticated', () => {
    let sent;
    const req = {
      path: '/api/wallet/balance',
      originalUrl: '/api/wallet/balance',
      traceId: 'mw-trace-1',
      log: { warn: () => {} },
    };
    const res = {
      status(c) {
        sent = { status: c };
        return this;
      },
      json(b) {
        sent.body = b;
      },
    };
    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };
    requireMoneyPathIdentity({ mode: 'strict_authenticated' })(req, res, next);
    assert.equal(nextCalled, false);
    assert.equal(sent.status, 401);
    assert.equal(sent.body?.code, 'IDENTITY_TRUST_REQUIRED');
    assert.equal(sent.body?.error, 'identity_not_trusted');
  });

  it('allows attach_only for untrusted', () => {
    const req = {
      path: '/x',
      originalUrl: '/x',
      log: { warn: () => {} },
    };
    const res = {};
    let nextCalled = false;
    requireMoneyPathIdentity({ mode: 'attach_only' })(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, true);
    assert.ok(req.identityTrust);
  });
});

describe('dev bypass cannot activate in production (runtime gate)', () => {
  it('isDevCheckoutAuthBypassRuntimeConfigured is false when NODE_ENV=production', () => {
    const prevNe = process.env.NODE_ENV;
    const prevBypass = process.env.DEV_CHECKOUT_AUTH_BYPASS;
    const prevSecret = process.env.DEV_CHECKOUT_BYPASS_SECRET;
    const prevUid = process.env.DEV_CHECKOUT_BYPASS_USER_ID;
    process.env.NODE_ENV = 'production';
    process.env.DEV_CHECKOUT_AUTH_BYPASS = 'true';
    process.env.DEV_CHECKOUT_BYPASS_SECRET = '0123456789012345678901234';
    process.env.DEV_CHECKOUT_BYPASS_USER_ID = 'usr_any';
    try {
      assert.equal(isDevCheckoutAuthBypassRuntimeConfigured(), false);
    } finally {
      process.env.NODE_ENV = prevNe;
      if (prevBypass === undefined) delete process.env.DEV_CHECKOUT_AUTH_BYPASS;
      else process.env.DEV_CHECKOUT_AUTH_BYPASS = prevBypass;
      if (prevSecret === undefined) delete process.env.DEV_CHECKOUT_BYPASS_SECRET;
      else process.env.DEV_CHECKOUT_BYPASS_SECRET = prevSecret;
      if (prevUid === undefined) delete process.env.DEV_CHECKOUT_BYPASS_USER_ID;
      else process.env.DEV_CHECKOUT_BYPASS_USER_ID = prevUid;
    }
  });
});

describe('money-path HTTP surfaces (identity layer)', () => {
  const app = createApp();

  it('GET /api/wallet/balance without auth returns 401 (no bearer)', async () => {
    const res = await request(app).get('/api/wallet/balance');
    assert.equal(res.status, 401);
  });

  it('POST /api/checkout-pricing-quote still succeeds for valid anonymous quote', async () => {
    const res = await request(app)
      .post('/api/checkout-pricing-quote')
      .set('Content-Type', 'application/json')
      .send({
        senderCountry: 'US',
        currency: 'usd',
        amountUsdCents: 500,
        operatorKey: 'roshan',
        recipientPhone: '0701234567',
      });
    assert.equal(res.status, 200);
    assert.equal(typeof res.body?.pricingBreakdown?.totalUsdCents, 'number');
  });

  it('POST /webhooks/stripe is not blocked by identity guard (signature path)', async () => {
    assert.ok(
      env.stripeWebhookSecret?.startsWith('whsec_'),
      'STRIPE_WEBHOOK_SECRET required (test setup)',
    );
    const payload = JSON.stringify({
      id: `evt_id_${randomUUID().slice(0, 8)}`,
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: `cs_${randomUUID().slice(0, 8)}`,
          object: 'checkout.session',
          metadata: {},
        },
      },
    });
    const badHeader = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret: `whsec_${'z'.repeat(32)}`,
    });
    const res = await request(app)
      .post('/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', badHeader)
      .send(payload);
    assert.equal(res.status, 400);
    const text = String(res.text ?? res.body ?? '');
    assert.match(text, /Webhook|signature|No signatures/i);
    assert.ok(!text.includes('identity_not_trusted'));
    assert.ok(!text.includes('IDENTITY_TRUST_REQUIRED'));
  });
});
