/**
 * L11 — Ledger failure inside Stripe webhook transaction rolls back all durable writes
 * (StripeWebhookEvent, PAID transition, partial journal header).
 *
 * Requires registerChaosWebhookEnv + preloadTestDatabaseUrl (same wave as HTTP chaos).
 * Injection: NODE_ENV=test + ZW_TEST_INJECT_LEDGER_POST_THROW=<PaymentCheckout.id>
 * (see ledgerService.maybeZwTestThrowLedgerJournalMidWrite).
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { describe, it, before, after, afterEach } from 'node:test';
import bcrypt from 'bcrypt';
import Stripe from 'stripe';
import request from 'supertest';

import { prisma } from '../../src/db.js';
import { ORDER_STATUS } from '../../src/constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../../src/constants/paymentCheckoutStatus.js';
import { LEDGER_EVENT_TYPE } from '../../src/ledger/ledgerService.js';
import { createApp } from '../../src/app.js';

if (process.env.CI === 'true' && !process.env.TEST_DATABASE_URL) {
  throw new Error('CI requires TEST_DATABASE_URL');
}

const dbUrl = String(process.env.DATABASE_URL ?? '').trim();
const runIntegration = Boolean(dbUrl);

describe('L11 ledger webhook rollback injection (integration)', { skip: !runIntegration }, () => {
  /** @type {import('express').Express} */
  let app;
  const webhookSecret = String(process.env.STRIPE_WEBHOOK_SECRET ?? '').trim();

  before(async () => {
    process.env.NODE_ENV = 'test';
    app = createApp();
  });

  after(async () => {
    delete process.env.ZW_TEST_INJECT_LEDGER_POST_THROW;
  });

  afterEach(async () => {
    delete process.env.ZW_TEST_INJECT_LEDGER_POST_THROW;
  });

  async function makeUser() {
    return prisma.user.create({
      data: {
        email: `l11_rb_${randomUUID()}@test.invalid`,
        passwordHash: await bcrypt.hash('x', 4),
      },
    });
  }

  async function makePendingCheckout(userId) {
    return prisma.paymentCheckout.create({
      data: {
        idempotencyKey: randomUUID(),
        requestFingerprint: `fp_${randomUUID().slice(0, 12)}`,
        userId,
        status: PAYMENT_CHECKOUT_STATUS.INITIATED,
        orderStatus: ORDER_STATUS.PENDING,
        amountUsdCents: 1000,
        currency: 'usd',
        senderCountryCode: 'US',
        operatorKey: 'mtn',
        recipientNational: '701234567',
        productType: 'mobile_topup',
        providerCostUsdCents: 800,
        stripeFeeEstimateUsdCents: 59,
        fxBufferUsdCents: 0,
        riskBufferUsdCents: 0,
        projectedNetMarginBp: 400,
      },
    });
  }

  /**
   * @param {string} type
   * @param {object} obj
   * @param {string} [eventId]
   */
  function signAndPost(type, obj, eventId) {
    const id = eventId ?? `evt_l11_rb_${randomUUID()}`;
    const sessionObj =
      type === 'checkout.session.completed' && obj && typeof obj === 'object'
        ? { mode: 'payment', payment_status: 'paid', ...obj }
        : obj;
    const payload = JSON.stringify({
      id,
      object: 'event',
      type,
      data: { object: sessionObj },
    });
    const header = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret: webhookSecret,
    });
    return {
      req: request(app)
        .post('/webhooks/stripe')
        .set('Content-Type', 'application/json')
        .set('Stripe-Signature', header)
        .send(payload),
      id,
    };
  }

  async function settle(ms = 2200) {
    await new Promise((r) => setTimeout(r, ms));
  }

  it('ledger mid-write injection: txn rolls back; replay succeeds with balanced ledger', async () => {
    assert.ok(webhookSecret.startsWith('whsec_'), 'need webhook signing secret');

    const user = await makeUser();
    const order = await makePendingCheckout(user.id);
    const piId = `pi_l11_rb_${randomUUID().slice(0, 10)}`;
    const sessionId = `cs_l11_rb_${randomUUID().slice(0, 10)}`;
    const eventId = `evt_l11_rb_${randomUUID()}`;

    process.env.ZW_TEST_INJECT_LEDGER_POST_THROW = order.id;

    const sessionPayload = {
      id: sessionId,
      object: 'checkout.session',
      amount_total: 1000,
      currency: 'usd',
      payment_intent: piId,
      customer: 'cus_l11_rb',
      metadata: { internalCheckoutId: order.id, zwTraceId: 'trace_l11_rb' },
    };

    await signAndPost('checkout.session.completed', sessionPayload, eventId).req.expect(
      200,
    );
    await settle();

    delete process.env.ZW_TEST_INJECT_LEDGER_POST_THROW;

    const afterFail = await prisma.paymentCheckout.findUnique({
      where: { id: order.id },
    });
    assert.equal(afterFail?.orderStatus, ORDER_STATUS.PENDING);
    assert.equal(
      await prisma.stripeWebhookEvent.count({ where: { id: eventId } }),
      0,
    );
    assert.equal(
      await prisma.ledgerJournalEntry.count({
        where: { paymentCheckoutId: order.id },
      }),
      0,
    );
    assert.equal(
      await prisma.fulfillmentAttempt.count({ where: { orderId: order.id } }),
      0,
    );

    await signAndPost('checkout.session.completed', sessionPayload, eventId).req.expect(
      200,
    );
    await settle();

    const afterOk = await prisma.paymentCheckout.findUnique({
      where: { id: order.id },
    });
    assert.ok(
      afterOk?.orderStatus === ORDER_STATUS.PAID ||
        afterOk?.orderStatus === ORDER_STATUS.FULFILLED,
    );
    assert.equal(
      await prisma.stripeWebhookEvent.count({ where: { id: eventId } }),
      1,
    );

    const entries = await prisma.ledgerJournalEntry.findMany({
      where: {
        paymentCheckoutId: order.id,
        eventType: LEDGER_EVENT_TYPE.PAYMENT_CAPTURED,
      },
      include: { lines: true },
    });
    assert.equal(entries.length, 1);
    const lines = entries[0]?.lines ?? [];
    let deb = 0;
    let cred = 0;
    for (const ln of lines) {
      deb += ln.debitCents;
      cred += ln.creditCents;
    }
    assert.equal(deb, cred);
    assert.ok(deb > 0);

    assert.ok(
      (await prisma.fulfillmentAttempt.count({ where: { orderId: order.id } })) >= 1,
    );
  });
});
