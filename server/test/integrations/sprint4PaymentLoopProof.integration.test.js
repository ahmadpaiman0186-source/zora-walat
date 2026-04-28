/**
 * Sprint 4 — real payment loop proof (strongest **safe** path in CI/local without live cards).
 *
 * | Requirement | Evidence |
 * |-------------|----------|
 * | Auth / valid user | User row + `getCanonicalPhase1OrderForUser` scoped to `userId` |
 * | Payment creation | Phase 1 `PaymentCheckout` row (stand-in for `/create-checkout-session` persistence) |
 * | Success recognition | Signed `checkout.session.completed` through **real** `POST /webhooks/stripe` |
 * | Order transition | `orderStatus === PAID`, `stripePaymentIntentId` set |
 * | Fulfillment trigger | Exactly one `FulfillmentAttempt`, `QUEUED` |
 * | Reconciliation | Canonical DTO: `supportCorrelationChecklist`, `stripePaymentIntentId`, `completedByStripeWebhookEventId` |
 * | User-visible state | `customerVisibleFulfillment` — if inline mock completes, `FULFILLED` + `fulfilled` (still not “awaiting payment”); otherwise `PAID` + `paid` |
 * | Duplicate safety | Same `event.id` replay → HTTP 200, still one attempt |
 *
 * **Live Stripe** (`sk_test_…` + Dashboard + `stripe listen`) is documented in `docs/STRIPE_LOCAL_WEBHOOK_FLOW.md`
 * and `scripts/stripe-prep-smoke.mjs` — not required for this suite.
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
import { FULFILLMENT_ATTEMPT_STATUS } from '../../src/constants/fulfillmentAttemptStatus.js';
import { CUSTOMER_FULFILLMENT_VIEW } from '../../src/lib/customerVisibleOrderStatus.js';
import { createApp } from '../../src/app.js';
import { getCanonicalPhase1OrderForUser } from '../../src/services/canonicalPhase1OrderService.js';

if (process.env.CI === 'true' && !process.env.TEST_DATABASE_URL) {
  throw new Error('CI requires TEST_DATABASE_URL for Sprint 4 payment-loop proof tests');
}

const dbUrl = String(process.env.DATABASE_URL ?? '').trim();
const runIntegration = Boolean(dbUrl);

describe('Sprint 4 — payment loop proof (integration)', { skip: !runIntegration }, () => {
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
      where: { id: { startsWith: 'evt_s4_' } },
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
        email: `s4_${randomUUID()}@test.invalid`,
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
    const id = eventId ?? `evt_s4_${randomUUID()}`;
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

  it('end-to-end: signed checkout.session.completed → PAID + PI + single fulfillment + recon + coherent customer view', async () => {
    const user = await makeUser();
    const order = await makePendingCheckout(user.id);
    const piId = `pi_s4_${randomUUID().slice(0, 12)}`;
    const eventId = `evt_s4_${randomUUID()}`;

    const res = await signAndPost(
      'checkout.session.completed',
      {
        id: `cs_s4_${randomUUID().slice(0, 8)}`,
        object: 'checkout.session',
        amount_total: 1000,
        currency: 'usd',
        payment_intent: piId,
        customer: 'cus_s4_test',
        metadata: { internalCheckoutId: order.id },
      },
      eventId,
    ).req.expect(200);

    assert.equal(res.body.received, true);
    await settle();

    const row = await prisma.paymentCheckout.findUnique({ where: { id: order.id } });
    assert.ok(
      row?.orderStatus === ORDER_STATUS.PAID || row?.orderStatus === ORDER_STATUS.FULFILLED,
      `expected PAID or FULFILLED after webhook + fulfillment, got ${row?.orderStatus}`,
    );
    assert.equal(row?.stripePaymentIntentId, piId);
    assert.equal(row?.completedByWebhookEventId, eventId);

    const nAtt = await prisma.fulfillmentAttempt.count({ where: { orderId: order.id } });
    assert.equal(nAtt, 1);
    const att = await prisma.fulfillmentAttempt.findFirst({
      where: { orderId: order.id },
    });
    assert.ok(
      att?.status === FULFILLMENT_ATTEMPT_STATUS.QUEUED ||
        att?.status === FULFILLMENT_ATTEMPT_STATUS.PROCESSING ||
        att?.status === FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED,
      `unexpected attempt status ${att?.status}`,
    );

    const dto = await getCanonicalPhase1OrderForUser(order.id, user.id, { prisma });
    assert.ok(dto);
    assert.equal(dto.checkoutId, order.id);
    assert.ok(
      dto.lifecycleStatus === ORDER_STATUS.PAID || dto.lifecycleStatus === ORDER_STATUS.FULFILLED,
    );
    assert.equal(dto.stripePaymentIntentId, piId);
    assert.equal(dto.completedByStripeWebhookEventId, eventId);
    const checklist = dto.supportCorrelationChecklist;
    assert.ok(checklist && typeof checklist === 'object');
    assert.equal(checklist.stripeObjects.paymentIntentId, piId);
    assert.equal(checklist.stripeObjects.webhookEventIdThatCompleted, eventId);

    const vis = dto.customerVisibleFulfillment;
    assert.equal(vis.customerPaid, true);
    if (dto.lifecycleStatus === ORDER_STATUS.FULFILLED) {
      assert.equal(vis.code, CUSTOMER_FULFILLMENT_VIEW.FULFILLED);
    } else {
      assert.equal(vis.code, CUSTOMER_FULFILLMENT_VIEW.PAID);
      assert.notEqual(vis.code, CUSTOMER_FULFILLMENT_VIEW.FULFILLED);
    }
    assert.ok(Array.isArray(dto.lifecycleCoherenceViolations));
  });

  it('stripe checkout session id mismatch: order marked FAILED, not PAID', async () => {
    const user = await makeUser();
    const order = await makePendingCheckout(user.id, {
      stripeCheckoutSessionId: `cs_s4_expected_${randomUUID().slice(0, 8)}`,
    });
    const eventId = `evt_s4_${randomUUID()}`;
    const res = await signAndPost(
      'checkout.session.completed',
      {
        id: `cs_s4_different_${randomUUID().slice(0, 8)}`,
        object: 'checkout.session',
        amount_total: 1000,
        currency: 'usd',
        payment_intent: `pi_s4_${randomUUID().slice(0, 8)}`,
        customer: 'cus_s4_test',
        metadata: { internalCheckoutId: order.id },
      },
      eventId,
    ).req.expect(200);

    assert.equal(res.body.received, true);
    await settle();

    const row = await prisma.paymentCheckout.findUnique({ where: { id: order.id } });
    assert.equal(row?.orderStatus, ORDER_STATUS.FAILED);
    assert.equal(row?.status, PAYMENT_CHECKOUT_STATUS.PAYMENT_FAILED);
    assert.equal(row?.failureReason, 'stripe_checkout_session_mismatch');
    assert.equal(row?.completedByWebhookEventId, null);
    const nAtt = await prisma.fulfillmentAttempt.count({ where: { orderId: order.id } });
    assert.equal(nAtt, 0);
  });

  it('duplicate replay: same Stripe event id returns 200 and does not duplicate fulfillment', async () => {
    const user = await makeUser();
    const order = await makePendingCheckout(user.id);
    const piId = `pi_s4_dup_${randomUUID().slice(0, 8)}`;
    const eventId = `evt_s4_${randomUUID()}`;
    const session = {
      id: `cs_s4_dup_${randomUUID().slice(0, 8)}`,
      object: 'checkout.session',
      amount_total: 1000,
      currency: 'usd',
      payment_intent: piId,
      customer: 'cus_s4_test',
      metadata: { internalCheckoutId: order.id },
    };

    await signAndPost('checkout.session.completed', session, eventId).req.expect(200);
    await settle();
    await signAndPost('checkout.session.completed', session, eventId).req.expect(200);
    await settle();

    const nAtt = await prisma.fulfillmentAttempt.count({ where: { orderId: order.id } });
    assert.equal(nAtt, 1);
  });
});
