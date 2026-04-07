/**
 * HTTP-level Stripe webhook chaos: signed payloads through real Express `/webhooks/stripe`
 * (signature verification, Prisma transaction, idempotency, async fee + fulfillment scheduling).
 *
 * Run via `npm run test:integration` (uses registerChaosWebhookEnv preload) or:
 *   node --import ./test/integrations/registerChaosWebhookEnv.mjs --test test/integrations/stripeWebhookHttpChaos.integration.test.js
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { describe, it, before, after, afterEach } from 'node:test';
import { performance } from 'node:perf_hooks';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import Stripe from 'stripe';
import request from 'supertest';

import { ORDER_STATUS } from '../../src/constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../../src/constants/paymentCheckoutStatus.js';
import { POST_PAYMENT_INCIDENT_STATUS } from '../../src/constants/postPaymentIncidentStatus.js';
import { POST_PAYMENT_INCIDENT_MAP_SOURCE } from '../../src/constants/postPaymentIncidentMapSource.js';
import { FINANCIAL_ANOMALY } from '../../src/constants/financialAnomaly.js';
import { createApp } from '../../src/app.js';
import { getCanonicalPhase1OrderForUser } from '../../src/services/canonicalPhase1OrderService.js';

if (process.env.CI === 'true' && !process.env.TEST_DATABASE_URL) {
  throw new Error('CI requires TEST_DATABASE_URL for webhook chaos integration tests');
}

const dbUrl = process.env.TEST_DATABASE_URL;
const runIntegration = Boolean(dbUrl);

describe('Stripe webhook HTTP chaos (Phase 1)', { skip: !runIntegration }, () => {
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
    if (userIds.length > 0) {
      await prisma.loyaltyLedger.deleteMany({ where: { userId: { in: userIds } } });
    }
    for (const oid of orderIds) {
      await prisma.paymentCheckout.deleteMany({ where: { id: oid } });
    }
    await prisma.stripeWebhookEvent.deleteMany({
      where: {
        id: {
          startsWith: 'evt_http_chaos_',
        },
      },
    });
    for (const uid of userIds) {
      await prisma.user.deleteMany({ where: { id: uid } });
    }
    userIds.length = 0;
    orderIds.length = 0;
  });

  async function makeUser() {
    const u = await prisma.user.create({
      data: {
        email: `http_chaos_${randomUUID()}@test.invalid`,
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
        financialAnomalyCodes: [FINANCIAL_ANOMALY.LOW_MARGIN],
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
    const id = eventId ?? `evt_http_chaos_${randomUUID()}`;
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

  /** Mock airtime may fulfill before assertions; money path still valid if PAID or FULFILLED. */
  function assertOrderPaidOrFulfilled(/** @type {string | undefined} */ status) {
    assert.ok(
      status === ORDER_STATUS.PAID || status === ORDER_STATUS.FULFILLED,
      `expected PAID or FULFILLED, got ${status}`,
    );
  }

  it('interleave: payment_intent.succeeded before checkout.session.completed (order becomes paid once)', async () => {
    const user = await makeUser();
    const order = await makePendingCheckout(user.id);
    const piId = `pi_http_seq_${randomUUID().slice(0, 8)}`;
    const sessionId = `cs_http_seq_${randomUUID().slice(0, 8)}`;

    const p1 = await signAndPost('payment_intent.succeeded', {
      id: piId,
      object: 'payment_intent',
      status: 'succeeded',
      currency: 'usd',
      amount: 1000,
      metadata: {},
    }).req.expect(200);

    assert.equal(p1.body.received, true);

    const p2 = await signAndPost('checkout.session.completed', {
      id: sessionId,
      object: 'checkout.session',
      amount_total: 1000,
      currency: 'usd',
      payment_intent: piId,
      customer: 'cus_http_test',
      metadata: { internalCheckoutId: order.id },
    }).req.expect(200);

    assert.equal(p2.body.received, true);
    await settle();

    const row = await prisma.paymentCheckout.findUnique({ where: { id: order.id } });
    assertOrderPaidOrFulfilled(row?.orderStatus);
    assert.equal(row?.stripePaymentIntentId, piId);
    const nAtt = await prisma.fulfillmentAttempt.count({ where: { orderId: order.id } });
    assert.equal(nAtt, 1);
  });

  it('interleave: checkout.session.completed before payment_intent.succeeded (single fulfillment, fee idempotent)', async () => {
    const user = await makeUser();
    const order = await makePendingCheckout(user.id);
    const piId = `pi_http_rev_${randomUUID().slice(0, 8)}`;

    const { req: q1 } = signAndPost('checkout.session.completed', {
      id: `cs_http_rev_${randomUUID().slice(0, 8)}`,
      object: 'checkout.session',
      amount_total: 1000,
      currency: 'usd',
      payment_intent: piId,
      customer: 'cus_http_test',
      metadata: { internalCheckoutId: order.id },
    });
    await q1.expect(200);
    await settle();

    await prisma.paymentCheckout.update({
      where: { id: order.id },
      data: { stripeFeeActualUsdCents: 59 },
    });

    const mkPiEvt = () =>
      signAndPost(
        'payment_intent.succeeded',
        {
          id: piId,
          object: 'payment_intent',
          status: 'succeeded',
          currency: 'usd',
          amount: 1000,
          metadata: {},
        },
      ).req.expect(200);

    await mkPiEvt();
    await mkPiEvt();
    await settle();

    const row = await prisma.paymentCheckout.findUnique({ where: { id: order.id } });
    assertOrderPaidOrFulfilled(row?.orderStatus);
    assert.equal(row?.stripeFeeActualUsdCents, 59);
    const nAtt = await prisma.fulfillmentAttempt.count({ where: { orderId: order.id } });
    assert.equal(nAtt, 1);
  });

  it('duplicate checkout.session.completed (different evt ids) does not duplicate fulfillment', async () => {
    const user = await makeUser();
    const order = await makePendingCheckout(user.id);
    const piId = `pi_http_dup_cs_${randomUUID().slice(0, 8)}`;
    const sessionPayload = {
      id: `cs_http_dup_${randomUUID().slice(0, 8)}`,
      object: 'checkout.session',
      amount_total: 1000,
      currency: 'usd',
      payment_intent: piId,
      customer: 'cus_http_test',
      metadata: { internalCheckoutId: order.id },
    };

    await signAndPost('checkout.session.completed', sessionPayload).req.expect(200);
    await signAndPost('checkout.session.completed', sessionPayload).req.expect(200);
    await settle();

    const nAtt = await prisma.fulfillmentAttempt.count({ where: { orderId: order.id } });
    assert.equal(nAtt, 1);
    const row = await prisma.paymentCheckout.findUnique({ where: { id: order.id } });
    assertOrderPaidOrFulfilled(row?.orderStatus);
  });

  it('charge.refunded after delivery updates postPaymentIncident + mapSource; canonical codes stay unique', async () => {
    const user = await makeUser();
    const order = await makePendingCheckout(user.id);
    const piId = `pi_http_rf_${randomUUID().slice(0, 8)}`;

    await signAndPost('checkout.session.completed', {
      id: `cs_http_rf_${randomUUID().slice(0, 8)}`,
      object: 'checkout.session',
      amount_total: 1000,
      currency: 'usd',
      payment_intent: piId,
      customer: 'cus_http_test',
      metadata: { internalCheckoutId: order.id },
    }).req.expect(200);
    await settle();

    await prisma.paymentCheckout.update({
      where: { id: order.id },
      data: {
        orderStatus: ORDER_STATUS.FULFILLED,
        status: PAYMENT_CHECKOUT_STATUS.RECHARGE_COMPLETED,
        fulfillmentProviderReference: 'ref_mock',
        fulfillmentProviderKey: 'mock',
      },
    });

    await signAndPost('charge.refunded', {
      id: 'ch_http_rf',
      object: 'charge',
      payment_intent: piId,
    }).req.expect(200);

    const dto = await getCanonicalPhase1OrderForUser(order.id, user.id, { prisma });
    assert.ok(dto);
    assert.equal(dto.postPaymentIncident.status, POST_PAYMENT_INCIDENT_STATUS.REFUNDED);
    assert.equal(dto.postPaymentIncident.mapSource, POST_PAYMENT_INCIDENT_MAP_SOURCE.REFUND_CHARGE_PAYLOAD);
    const codes = dto.financialAnomalyCodes;
    assert.equal(codes.length, new Set(codes).size);
  });

  it('dispute.created after payment maps via payload payment_intent', async () => {
    const user = await makeUser();
    const order = await makePendingCheckout(user.id);
    const piId = `pi_http_dsp_${randomUUID().slice(0, 8)}`;

    await signAndPost('checkout.session.completed', {
      id: `cs_http_dsp_${randomUUID().slice(0, 8)}`,
      object: 'checkout.session',
      amount_total: 1000,
      currency: 'usd',
      payment_intent: piId,
      customer: 'cus_http_test',
      metadata: { internalCheckoutId: order.id },
    }).req.expect(200);
    await settle();

    await signAndPost('charge.dispute.created', {
      id: 'dp_http_test',
      object: 'dispute',
      charge: 'ch_http_dsp',
      payment_intent: piId,
    }).req.expect(200);

    const dto = await getCanonicalPhase1OrderForUser(order.id, user.id, { prisma });
    assert.ok(dto);
    assert.equal(dto.postPaymentIncident.status, POST_PAYMENT_INCIDENT_STATUS.DISPUTED);
    assert.equal(dto.postPaymentIncident.mapSource, POST_PAYMENT_INCIDENT_MAP_SOURCE.DISPUTE_PAYLOAD_PI);
    assert.equal(dto.postPaymentIncident.disputeSupportMapping, 'direct_from_stripe_dispute_payload');
    assert.equal(dto.postPaymentIncident.incidentMappingAuditComplete, true);
  });

  it('measures sequential webhook POST latency (same process; lab only)', async () => {
    const user = await makeUser();
    const order = await makePendingCheckout(user.id);
    const piId = `pi_http_bench_${randomUUID().slice(0, 8)}`;
    const sessionPayload = {
      id: `cs_http_bench_${randomUUID().slice(0, 8)}`,
      object: 'checkout.session',
      amount_total: 1000,
      currency: 'usd',
      payment_intent: piId,
      customer: 'cus_http_test',
      metadata: { internalCheckoutId: order.id },
    };

    const latencies = [];
    const n = Math.min(15, Math.max(5, parseInt(process.env.PHASE1_HTTP_WEBHOOK_BENCH_N ?? '8', 10)));
    for (let i = 0; i < n; i += 1) {
      const t0 = performance.now();
      await signAndPost('checkout.session.completed', sessionPayload).req.expect(200);
      latencies.push(performance.now() - t0);
    }

    latencies.sort((a, b) => a - b);
    // eslint-disable-next-line no-console -- intentional measurement output for operators
    console.log(
      JSON.stringify({
        phase1Ops: true,
        event: 'http_webhook_chaos_lab_latency',
        n,
        p50ms: latencies[Math.floor(latencies.length * 0.5)],
        p95ms: latencies[Math.floor(latencies.length * 0.95)],
        note: 'Lab timing inside integration file; not a substitute for staging load (see scripts/phase1-money-path-load.mjs).',
      }),
    );
  });
});
