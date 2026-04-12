/**
 * Concurrency + idempotency guards (PostgreSQL). Requires migrated PostgreSQL.
 * Run with: node --import ./test/integrations/preloadTestDatabaseUrl.mjs --test …
 * so `src/db.js` and this file share the same effective `DATABASE_URL`.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { describe, it, before, after, afterEach } from 'node:test';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

import { ORDER_STATUS } from '../../src/constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../../src/constants/paymentCheckoutStatus.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../../src/constants/fulfillmentAttemptStatus.js';
import { POST_PAYMENT_INCIDENT_STATUS } from '../../src/constants/postPaymentIncidentStatus.js';
import { processFulfillmentForOrder } from '../../src/services/fulfillmentProcessingService.js';
import { applyPhase1CheckoutSessionCompleted } from '../../src/services/phase1StripeCheckoutSessionCompleted.js';

if (process.env.CI === 'true' && !process.env.TEST_DATABASE_URL) {
  throw new Error('CI requires TEST_DATABASE_URL');
}

const dbUrl = String(process.env.DATABASE_URL ?? '').trim();
const runIntegration = Boolean(dbUrl);

describe('Transaction fortress concurrency (integration)', { skip: !runIntegration }, () => {
  /** @type {PrismaClient} */
  let prisma;
  /** @type {string[]} */
  const userIds = [];
  /** @type {string[]} */
  const orderIds = [];
  /** @type {string[]} */
  const eventIds = [];

  before(async () => {
    prisma = new PrismaClient({ datasourceUrl: dbUrl });
    await prisma.$connect();
  });

  after(async () => {
    if (!prisma) return;
    await prisma.$disconnect();
  });

  afterEach(async () => {
    if (!prisma) return;
    for (const uid of userIds) {
      await prisma.loyaltyLedger.deleteMany({ where: { userId: uid } });
    }
    /** `User` delete is RESTRICT-ed by `LoyaltyPointsGrant`; delivered tests create grants. */
    if (userIds.length) {
      await prisma.loyaltyPointsGrant.deleteMany({ where: { userId: { in: userIds } } });
    }
    for (const oid of orderIds) {
      await prisma.fulfillmentAttempt.deleteMany({ where: { orderId: oid } });
    }
    for (const oid of orderIds) {
      await prisma.paymentCheckout.deleteMany({ where: { id: oid } });
    }
    for (const eid of eventIds) {
      await prisma.stripeWebhookEvent.deleteMany({ where: { id: eid } });
    }
    for (const uid of userIds) {
      await prisma.user.deleteMany({ where: { id: uid } });
    }
    userIds.length = 0;
    orderIds.length = 0;
    eventIds.length = 0;
  });

  async function makeUser() {
    const u = await prisma.user.create({
      data: {
        email: `tf_${randomUUID()}@test.invalid`,
        passwordHash: await bcrypt.hash('x', 4),
      },
    });
    userIds.push(u.id);
    return u;
  }

  /** @param {Record<string, unknown>} [rowExtras] scalar / non-nested checkout fields only */
  async function paidCheckoutWithQueuedAttempt(userId, rowExtras = {}) {
    const {
      postPaymentIncidentStatus: incidentStatus,
      postPaymentIncidentUpdatedAt: incidentUpdatedAt,
      ...restExtras
    } = rowExtras;
    const row = await prisma.paymentCheckout.create({
      data: {
        idempotencyKey: randomUUID(),
        requestFingerprint: `fp_${randomUUID().slice(0, 12)}`,
        userId,
        status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
        orderStatus: ORDER_STATUS.PAID,
        amountUsdCents: 1000,
        currency: 'usd',
        senderCountryCode: 'US',
        operatorKey: 'mtn',
        recipientNational: '701234567',
        productType: 'mobile_topup',
        providerCostUsdCents: 800,
        stripeFeeEstimateUsdCents: 59,
        stripeFeeActualUsdCents: 58,
        fxBufferUsdCents: 0,
        riskBufferUsdCents: 0,
        projectedNetMarginBp: 400,
        stripePaymentIntentId: `pi_tf_${randomUUID().slice(0, 8)}`,
        completedByWebhookEventId: `evt_tf_${randomUUID().slice(0, 8)}`,
        paidAt: new Date(),
        ...restExtras,
        fulfillmentAttempts: {
          create: {
            attemptNumber: 1,
            status: FULFILLMENT_ATTEMPT_STATUS.QUEUED,
            provider: 'mock',
            requestSummary: JSON.stringify({ phase: 'queued' }),
          },
        },
      },
    });
    if (incidentStatus != null) {
      await prisma.paymentCheckout.update({
        where: { id: row.id },
        data: {
          postPaymentIncidentStatus: incidentStatus,
          postPaymentIncidentUpdatedAt: incidentUpdatedAt ?? new Date(),
        },
      });
    }
    orderIds.push(row.id);
    return row.id;
  }

  it('duplicate checkout.session.completed does not create second attempt #1', async () => {
    const u = await makeUser();
    const c = await prisma.paymentCheckout.create({
      data: {
        idempotencyKey: randomUUID(),
        requestFingerprint: `fp_${randomUUID().slice(0, 12)}`,
        userId: u.id,
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
    orderIds.push(c.id);

    const session = {
      id: `cs_${randomUUID().slice(0, 8)}`,
      amount_total: 1000,
      currency: 'usd',
      payment_intent: `pi_${randomUUID().slice(0, 8)}`,
      customer: 'cus_x',
      metadata: { internalCheckoutId: c.id },
    };

    const run = (eid) =>
      prisma.$transaction(async (tx) => {
        await tx.stripeWebhookEvent.create({ data: { id: eid } });
        return applyPhase1CheckoutSessionCompleted(tx, {
          eventId: eid,
          session,
          log: console,
        });
      });

    const e1 = `evt_dup_${randomUUID()}`;
    const e2 = `evt_dup_${randomUUID()}`;
    eventIds.push(e1, e2);
    await run(e1);
    await run(e2);

    const attempts = await prisma.fulfillmentAttempt.findMany({
      where: { orderId: c.id },
    });
    assert.equal(attempts.length, 1);
    assert.equal(attempts[0].attemptNumber, 1);
  });

  it('two concurrent processFulfillmentForOrder on same order yield single PROCESSING claim', async () => {
    const u = await makeUser();
    const oid = await paidCheckoutWithQueuedAttempt(u.id);
    await Promise.all([
      processFulfillmentForOrder(oid, {}),
      processFulfillmentForOrder(oid, {}),
    ]);
    const attempts = await prisma.fulfillmentAttempt.findMany({
      where: { orderId: oid },
    });
    const processing = attempts.filter((a) => a.status === FULFILLMENT_ATTEMPT_STATUS.PROCESSING);
    const queued = attempts.filter((a) => a.status === FULFILLMENT_ATTEMPT_STATUS.QUEUED);
    const summary = attempts.map((a) => `${a.attemptNumber}:${a.status}`).join(',');
    assert.ok(
      processing.length <= 1,
      `at most one PROCESSING expected, got ${processing.length} (${summary})`,
    );
    assert.ok(queued.length <= 1, `at most one QUEUED expected, got ${queued.length} (${summary})`);
    assert.ok(
      attempts.length <= 1,
      `duplicate fulfillment attempts created for same order (fortress leak): ${summary}`,
    );
  });

  it('post-payment dispute blocks worker claim (stays PAID + QUEUED)', async () => {
    const u = await makeUser();
    const oid = await paidCheckoutWithQueuedAttempt(u.id, {
      postPaymentIncidentStatus: POST_PAYMENT_INCIDENT_STATUS.DISPUTED,
      postPaymentIncidentUpdatedAt: new Date(),
    });
    await processFulfillmentForOrder(oid, {});
    const row = await prisma.paymentCheckout.findUnique({
      where: { id: oid },
      select: { orderStatus: true },
    });
    assert.equal(row?.orderStatus, ORDER_STATUS.PAID);
    const attempts = await prisma.fulfillmentAttempt.findMany({
      where: { orderId: oid },
    });
    assert.ok(attempts.every((a) => a.status === FULFILLMENT_ATTEMPT_STATUS.QUEUED));
  });

  it('parallel distinct orders all advance without deadlocking', async () => {
    const u = await makeUser();
    const ids = await Promise.all(
      Array.from({ length: 8 }, () => paidCheckoutWithQueuedAttempt(u.id)),
    );
    await Promise.all(ids.map((id) => processFulfillmentForOrder(id, {})));

    const workerVisible = (s) =>
      s === ORDER_STATUS.PROCESSING ||
      s === ORDER_STATUS.FULFILLED ||
      s === ORDER_STATUS.FAILED;

    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      const rows = await prisma.paymentCheckout.findMany({
        where: { id: { in: ids } },
        select: { id: true, orderStatus: true },
      });
      if (rows.length === ids.length && rows.every((r) => workerVisible(r.orderStatus))) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 30));
    }

    const rows = await prisma.paymentCheckout.findMany({
      where: { id: { in: ids } },
      select: { id: true, orderStatus: true },
    });
    assert.fail(
      `expected all orders in PROCESSING|FULFILLED|FAILED within 8s; got ${JSON.stringify(rows)}`,
    );
  });
});
