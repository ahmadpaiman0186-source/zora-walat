/**
 * charge.dispute.created: when charges.retrieve is required and fails, webhook must return 503
 * and must not run prisma.$transaction (no StripeWebhookEvent row for that attempt).
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import request from 'supertest';
import Stripe from 'stripe';

import { API_CONTRACT_CODE } from '../src/constants/apiContractCodes.js';
import { getValidatedStripeSecretKey } from '../src/config/stripeEnv.js';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { prisma } from '../src/db.js';
import {
  clearStripeClientOverrideForTests,
  setStripeClientOverrideForTests,
} from '../src/services/stripe.js';

describe('Stripe webhook dispute charge lookup failure (HTTP 503, no transaction)', () => {
  /** @type {import('express').Express} */
  let app;
  /** @type {typeof prisma.$transaction} */
  let origPrismaTransaction;
  let prismaTransactionCallCount = 0;

  before(() => {
    prismaTransactionCallCount = 0;
    const key = getValidatedStripeSecretKey();
    assert.ok(key, 'STRIPE_SECRET_KEY required for Stripe.webhooks.constructEvent in this test');
    const client = new Stripe(key, {
      timeout: 25_000,
      maxNetworkRetries: 0,
    });
    client.charges.retrieve = async () => {
      throw new Error('simulated_charges_retrieve_failure');
    };
    setStripeClientOverrideForTests(client);
    origPrismaTransaction = prisma.$transaction.bind(prisma);
    prisma.$transaction = async (...args) => {
      prismaTransactionCallCount += 1;
      throw new Error('prisma_transaction_must_not_run_on_dispute_lookup_failure');
    };
    app = createApp();
  });

  after(() => {
    clearStripeClientOverrideForTests();
    prisma.$transaction = origPrismaTransaction;
  });

  it('returns HTTP 503 and does not invoke prisma.$transaction', async () => {
    assert.ok(
      env.stripeWebhookSecret?.startsWith('whsec_'),
      'STRIPE_WEBHOOK_SECRET must be set (see setupTestEnv synthetic default)',
    );
    const eventId = `evt_dsp_503_${randomUUID().slice(0, 8)}`;
    const payload = JSON.stringify({
      id: eventId,
      object: 'event',
      type: 'charge.dispute.created',
      data: {
        object: {
          id: 'dp_503_test',
          object: 'dispute',
          charge: 'ch_503_need_lookup',
        },
      },
    });
    const sig = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret: env.stripeWebhookSecret,
    });
    const res = await request(app)
      .post('/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', sig)
      .send(payload);

    assert.equal(res.status, 503);
    assert.equal(res.body?.success, false);
    assert.equal(res.body?.code, API_CONTRACT_CODE.INTERNAL_ERROR);
    assert.equal(prismaTransactionCallCount, 0);
  });
});

describe('Stripe webhook dispute with payment_intent (no charges.retrieve, transaction runs)', () => {
  /** @type {import('express').Express} */
  let app;
  /** @type {typeof prisma.$transaction} */
  let origPrismaTransaction;
  let prismaTransactionCallCount = 0;
  let chargesRetrieveCallCount = 0;

  before(() => {
    prismaTransactionCallCount = 0;
    chargesRetrieveCallCount = 0;
    const key = getValidatedStripeSecretKey();
    assert.ok(key, 'STRIPE_SECRET_KEY required for Stripe.webhooks.constructEvent in this test');
    const client = new Stripe(key, {
      timeout: 25_000,
      maxNetworkRetries: 0,
    });
    client.charges.retrieve = async () => {
      chargesRetrieveCallCount += 1;
      throw new Error('charges.retrieve_must_not_run_when_dispute_has_payment_intent');
    };
    setStripeClientOverrideForTests(client);
    origPrismaTransaction = prisma.$transaction.bind(prisma);
    prisma.$transaction = async (...args) => {
      prismaTransactionCallCount += 1;
      return origPrismaTransaction(...args);
    };
    app = createApp();
  });

  after(() => {
    clearStripeClientOverrideForTests();
    prisma.$transaction = origPrismaTransaction;
  });

  it('enters prisma.$transaction, does not call charges.retrieve, returns 200 received', async () => {
    assert.ok(env.stripeWebhookSecret?.startsWith('whsec_'));
    const piId = `pi_dsp_ok_${randomUUID().slice(0, 8)}`;
    const eventId = `evt_dsp_ok_${randomUUID().slice(0, 8)}`;
    const payload = JSON.stringify({
      id: eventId,
      object: 'event',
      type: 'charge.dispute.created',
      data: {
        object: {
          id: 'dp_ok_test',
          object: 'dispute',
          payment_intent: piId,
        },
      },
    });
    const sig = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret: env.stripeWebhookSecret,
    });
    const res = await request(app)
      .post('/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', sig)
      .send(payload);

    assert.equal(chargesRetrieveCallCount, 0, 'charges.retrieve must not run when payment_intent is on dispute');
    assert.ok(
      prismaTransactionCallCount >= 1,
      'webhook must open prisma.$transaction for durable idempotency + handler',
    );
    assert.equal(res.status, 200);
    assert.equal(res.body?.received, true);
  });
});
