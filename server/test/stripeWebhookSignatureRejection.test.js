/**
 * Exercises real Express `/webhooks/stripe` signature gate without DB fixtures.
 * Preloaded: `setupTestEnv.mjs` (synthetic Stripe keys when unset).
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { describe, it, before } from 'node:test';
import request from 'supertest';
import Stripe from 'stripe';

import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';

describe('Stripe webhook signature rejection (HTTP)', () => {
  /** @type {import('express').Express} */
  let app;

  before(() => {
    app = createApp();
  });

  it('rejects wrong signing secret with HTTP 400', async () => {
    assert.ok(
      env.stripeWebhookSecret?.startsWith('whsec_'),
      'STRIPE_WEBHOOK_SECRET must be set (see setupTestEnv synthetic default)',
    );
    const payload = JSON.stringify({
      id: `evt_unit_sig_${randomUUID().slice(0, 8)}`,
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: `cs_unit_${randomUUID().slice(0, 8)}`,
          object: 'checkout.session',
          metadata: {},
        },
      },
    });
    const badHeader = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret: `whsec_${'q'.repeat(32)}`,
    });
    const res = await request(app)
      .post('/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', badHeader)
      .send(payload);
    assert.equal(res.status, 400);
    assert.match(String(res.text ?? ''), /Webhook Error|signature|No signatures/i);
  });
});
