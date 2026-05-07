/**
 * Concurrency + idempotency guards (PostgreSQL). Requires migrated PostgreSQL.
 * Run with: node --import ./test/integrations/preloadTestDatabaseUrl.mjs --test …
 * so `src/db.js` and this file share the same effective `DATABASE_URL`.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { describe, it, afterEach } from 'node:test';
import bcrypt from 'bcrypt';

import { prisma } from '../../src/db.js';
import { env } from '../../src/config/env.js';
import { ORDER_STATUS } from '../../src/constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../../src/constants/paymentCheckoutStatus.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../../src/constants/fulfillmentAttemptStatus.js';
import { POST_PAYMENT_INCIDENT_STATUS } from '../../src/constants/postPaymentIncidentStatus.js';
import { processFulfillmentForOrder } from '../../src/services/fulfillmentProcessingService.js';
import { applyPhase1CheckoutSessionCompleted } from '../../src/services/phase1StripeCheckoutSessionCompleted.js';
import { deleteLedgerJournalForPaymentCheckouts } from './integrationLedgerTestCleanup.js';

if (process.env.CI === 'true' && !process.env.TEST_DATABASE_URL) {
  throw new Error('CI requires TEST_DATABASE_URL');
}

const dbUrl = String(process.env.DATABASE_URL ?? '').trim();
const runIntegration = Boolean(dbUrl);
/** Matches CI (`AIRTIME_PROVIDER=mock`); local `.env.local` may skip these cases. */
const mockAirtimeProvider =
  String(env.airtimeProvider ?? '').trim().toLowerCase() === 'mock';

describe('Transaction fortress concurrency (integration)', { skip: !runIntegration }, () => {
  /** @type {string[]} */
  const userIds = [];
  /** @type {string[]} */
  const orderIds = [];
  /** @type {string[]} */
  const eventIds = [];

  afterEach(async () => {
    if (!prisma) return;
    // Ledger journal entries are immutable and reference PaymentCheckout/FulfillmentAttempt with RESTRICT.
    // Do not attempt DB row deletion in teardown; rely on unique IDs + isolated integration DB.
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
      object: 'checkout.session',
      mode: 'payment',
      payment_status: 'paid',
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

  it(
    'stale PROCESSING + empty providerReference: resume then second dispatch is idempotent',
    { skip: !mockAirtimeProvider },
    async () => {
      const u = await makeUser();
      const oid = await paidCheckoutWithQueuedAttempt(u.id);
      const att = await prisma.fulfillmentAttempt.findFirst({
        where: { orderId: oid },
      });
      assert.ok(att);
      const staleStarted = new Date(Date.now() - 200_000);
      await prisma.paymentCheckout.update({
        where: { id: oid },
        data: {
          orderStatus: ORDER_STATUS.PROCESSING,
          status: PAYMENT_CHECKOUT_STATUS.RECHARGE_PENDING,
        },
      });
      await prisma.fulfillmentAttempt.update({
        where: { id: att.id },
        data: {
          status: FULFILLMENT_ATTEMPT_STATUS.PROCESSING,
          startedAt: staleStarted,
          providerReference: null,
        },
      });

      await processFulfillmentForOrder(oid, {});

      const deadline = Date.now() + 12_000;
      let lastStatus = '';
      while (Date.now() < deadline) {
        const row = await prisma.paymentCheckout.findUnique({
          where: { id: oid },
          select: { orderStatus: true },
        });
        lastStatus = String(row?.orderStatus ?? '');
        if (row?.orderStatus === ORDER_STATUS.FULFILLED) break;
        await new Promise((r) => setTimeout(r, 40));
      }
      assert.equal(
        lastStatus,
        ORDER_STATUS.FULFILLED,
        `expected FULFILLED after stale resume+mock delivery, got ${lastStatus}`,
      );

      await processFulfillmentForOrder(oid, {});
      const afterSecond = await prisma.paymentCheckout.findUnique({
        where: { id: oid },
        select: { orderStatus: true },
      });
      assert.equal(afterSecond?.orderStatus, ORDER_STATUS.FULFILLED);
    },
  );

  it(
    'two concurrent stale PROCESSING resumes: single terminal attempt shape',
    { skip: !mockAirtimeProvider },
    async () => {
      const u = await makeUser();
      const oid = await paidCheckoutWithQueuedAttempt(u.id);
      const att = await prisma.fulfillmentAttempt.findFirst({
        where: { orderId: oid },
      });
      assert.ok(att);
      const staleStarted = new Date(Date.now() - 200_000);
      await prisma.paymentCheckout.update({
        where: { id: oid },
        data: {
          orderStatus: ORDER_STATUS.PROCESSING,
          status: PAYMENT_CHECKOUT_STATUS.RECHARGE_PENDING,
        },
      });
      await prisma.fulfillmentAttempt.update({
        where: { id: att.id },
        data: {
          status: FULFILLMENT_ATTEMPT_STATUS.PROCESSING,
          startedAt: staleStarted,
          providerReference: null,
        },
      });

      await Promise.all([processFulfillmentForOrder(oid, {}), processFulfillmentForOrder(oid, {})]);

      const deadline = Date.now() + 12_000;
      let lastStatus = '';
      while (Date.now() < deadline) {
        const row = await prisma.paymentCheckout.findUnique({
          where: { id: oid },
          select: { orderStatus: true },
        });
        lastStatus = String(row?.orderStatus ?? '');
        if (row?.orderStatus === ORDER_STATUS.FULFILLED) break;
        await new Promise((r) => setTimeout(r, 40));
      }
      assert.equal(lastStatus, ORDER_STATUS.FULFILLED, `expected FULFILLED, got ${lastStatus}`);

      const attempts = await prisma.fulfillmentAttempt.findMany({
        where: { orderId: oid },
      });
      const succeeded = attempts.filter((a) => a.status === FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED);
      assert.equal(
        succeeded.length,
        1,
        attempts.map((a) => `${a.attemptNumber}:${a.status}`).join(','),
      );
    },
  );

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
