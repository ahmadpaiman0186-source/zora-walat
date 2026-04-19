/**
 * Sprint 5 — reconciliation / traceability proof (stored identifiers only).
 *
 * Answers (evidence from PostgreSQL + canonical DTO after real signed webhook):
 * - Who paid? → `User.id`, `User.email`, `PaymentCheckout.userId`
 * - Which order? → `PaymentCheckout.id`
 * - Which Stripe object? → `stripePaymentIntentId`, `stripeCustomerId` (and optional `stripeCheckoutSessionId` on row)
 * - Which webhook event? → `StripeWebhookEvent.id` === `PaymentCheckout.completedByWebhookEventId`
 * - Fulfillment state? → `FulfillmentAttempt.status` (latest)
 * - Final lifecycle? → `PaymentCheckout.orderStatus` + DTO `lifecycleStatus`
 *
 * Automated path uses `sprint4PaymentLoopEnv.mjs` (synthetic whsec + sk_test placeholder) — signature path is real;
 * Stripe API fee jobs may log failures (expected). For real `sk_test_` + `whsec_` from CLI: `npm run proof:sprint5`,
 * then `npm run proof:sprint5:stripe-api` (read-only Stripe API) and `npm run proof:sprint5:db -- <checkoutId>` (PostgreSQL linkage).
 */
import './sprint4PaymentLoopEnv.mjs';

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { describe, it, before, after, afterEach } from 'node:test';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import Stripe from 'stripe';
import request from 'supertest';

import { ORDER_STATUS } from '../../src/constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../../src/constants/paymentCheckoutStatus.js';
import { createApp } from '../../src/app.js';
import { getCanonicalPhase1OrderForUser } from '../../src/services/canonicalPhase1OrderService.js';
import { PHASE1_RECONCILIATION_HINTS_SCHEMA } from '../../src/lib/phase1ReconciliationHints.js';

if (process.env.CI === 'true' && !process.env.TEST_DATABASE_URL) {
  throw new Error('CI requires TEST_DATABASE_URL for Sprint 5 reconciliation tests');
}

const dbUrl = String(process.env.DATABASE_URL ?? '').trim();
const runIntegration = Boolean(dbUrl);

describe('Sprint 5 — reconciliation & traceability (integration)', { skip: !runIntegration }, () => {
  /** @type {PrismaClient} */
  let prisma;
  /** @type {import('express').Express} */
  let app;
  const userIds = [];
  const orderIds = [];
  const webhookSecret = String(process.env.STRIPE_WEBHOOK_SECRET ?? '').trim();

  before(async () => {
    prisma = new PrismaClient({ datasourceUrl: dbUrl });
    await prisma.$connect();
    app = createApp();
  });

  after(async () => {
    if (prisma) await prisma.$disconnect();
  });

  afterEach(async () => {
    if (!prisma) return;
    for (const oid of orderIds) {
      await prisma.fulfillmentAttempt.deleteMany({ where: { orderId: oid } });
    }
    if (orderIds.length > 0) {
      await prisma.loyaltyPointsGrant.deleteMany({
        where: { paymentCheckoutId: { in: orderIds } },
      });
    }
    await prisma.stripeWebhookEvent.deleteMany({
      where: { id: { startsWith: 'evt_s5_' } },
    });
    for (const oid of orderIds) {
      await prisma.paymentCheckout.deleteMany({ where: { id: oid } });
    }
    if (userIds.length > 0) {
      await prisma.loyaltyLedger.deleteMany({ where: { userId: { in: userIds } } });
    }
    for (const uid of userIds) {
      await prisma.user.deleteMany({ where: { id: uid } });
    }
    userIds.length = 0;
    orderIds.length = 0;
  });

  async function makeUser() {
    const u = await prisma.user.create({
      data: {
        email: `s5_${randomUUID()}@test.invalid`,
        passwordHash: await bcrypt.hash('x', 4),
      },
    });
    userIds.push(u.id);
    return u;
  }

  async function makePendingCheckout(userId, patch = {}) {
    const row = await prisma.paymentCheckout.create({
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
        ...patch,
      },
    });
    orderIds.push(row.id);
    return row;
  }

  /**
   * @param {string} type
   * @param {object} obj
   * @param {string} [eventId]
   */
  function signAndPost(type, obj, eventId) {
    const id = eventId ?? `evt_s5_${randomUUID()}`;
    const payload = JSON.stringify({
      id,
      object: 'event',
      type,
      data: { object: obj },
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

  async function settle(ms = 700) {
    await new Promise((r) => setTimeout(r, ms));
  }

  it('stored identifiers link payer → order → Stripe PI → webhook evt → fulfillment → lifecycle + recon DTO', async () => {
    const user = await makeUser();
    const payer = await prisma.user.findUnique({ where: { id: user.id } });
    assert.ok(payer?.email);

    const order = await makePendingCheckout(user.id);
    const csId = `cs_s5_${randomUUID().slice(0, 10)}`;
    const piId = `pi_s5_${randomUUID().slice(0, 12)}`;
    const eventId = `evt_s5_${randomUUID()}`;

    await signAndPost(
      'checkout.session.completed',
      {
        id: csId,
        object: 'checkout.session',
        amount_total: 1000,
        currency: 'usd',
        payment_intent: piId,
        customer: 'cus_s5_test',
        metadata: { internalCheckoutId: order.id },
      },
      eventId,
    ).req.expect(200);
    await settle();

    const evtRow = await prisma.stripeWebhookEvent.findUnique({ where: { id: eventId } });
    assert.ok(evtRow, 'StripeWebhookEvent row must exist for completing event id');

    const checkout = await prisma.paymentCheckout.findUnique({ where: { id: order.id } });
    assert.ok(checkout);
    assert.equal(checkout.userId, user.id, 'who paid: checkout.userId === User.id');
    assert.equal(checkout.stripePaymentIntentId, piId, 'Stripe PaymentIntent id persisted');
    assert.equal(checkout.stripeCustomerId, 'cus_s5_test', 'Stripe Customer id persisted');
    assert.equal(checkout.completedByWebhookEventId, eventId, 'webhook event id persisted on checkout');
    assert.equal(checkout.completedByWebhookEventId, evtRow.id, 'DB event id matches StripeWebhookEvent');

    const attempts = await prisma.fulfillmentAttempt.findMany({
      where: { orderId: order.id },
      orderBy: { attemptNumber: 'asc' },
    });
    assert.equal(attempts.length, 1, 'single fulfillment trigger');
    const latest = attempts[0];
    assert.ok(latest?.status);

    assert.ok(
      checkout.orderStatus === ORDER_STATUS.PAID || checkout.orderStatus === ORDER_STATUS.FULFILLED,
    );

    const dto = await getCanonicalPhase1OrderForUser(order.id, user.id, { prisma });
    assert.ok(dto);
    assert.equal(dto.checkoutId, order.id);
    assert.equal(dto.lifecycleStatus, checkout.orderStatus);
    assert.equal(dto.stripePaymentIntentId, piId);
    assert.equal(dto.completedByStripeWebhookEventId, eventId);
    assert.equal(dto.supportCorrelationChecklist.stripeObjects.paymentIntentId, piId);
    assert.equal(dto.supportCorrelationChecklist.stripeObjects.webhookEventIdThatCompleted, eventId);
    assert.ok(dto.reconciliationHints);
    assert.equal(dto.reconciliationHints.schema, PHASE1_RECONCILIATION_HINTS_SCHEMA);
    assert.equal(dto.reconciliationHints.evidence.stripePaymentIntentId, piId);
    assert.equal(dto.reconciliationHints.evidence.completedByWebhookEventId, eventId);
    assert.equal(dto.reconciliationHints.checkoutId, order.id);
  });

  it('duplicate webhook event id: HTTP 200, no second fulfillment, StripeWebhookEvent row unchanged', async () => {
    const user = await makeUser();
    const order = await makePendingCheckout(user.id);
    const piId = `pi_s5_dup_${randomUUID().slice(0, 8)}`;
    const eventId = `evt_s5_${randomUUID()}`;
    const session = {
      id: `cs_s5_dup_${randomUUID().slice(0, 8)}`,
      object: 'checkout.session',
      amount_total: 1000,
      currency: 'usd',
      payment_intent: piId,
      customer: 'cus_s5_test',
      metadata: { internalCheckoutId: order.id },
    };

    await signAndPost('checkout.session.completed', session, eventId).req.expect(200);
    await settle();
    await signAndPost('checkout.session.completed', session, eventId).req.expect(200);
    await settle();

    const evts = await prisma.stripeWebhookEvent.count({ where: { id: eventId } });
    assert.equal(evts, 1);
    const nAtt = await prisma.fulfillmentAttempt.count({ where: { orderId: order.id } });
    assert.equal(nAtt, 1);
  });
});
