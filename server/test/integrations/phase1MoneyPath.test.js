/**
 * Live-like Phase 1 money path (PostgreSQL + services). Requires TEST_DATABASE_URL.
 * CI sets TEST_DATABASE_URL to a migrated DB.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { describe, it, before, after, afterEach } from 'node:test';
import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';

import { ORDER_STATUS } from '../../src/constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../../src/constants/paymentCheckoutStatus.js';
import { FINANCIAL_ANOMALY } from '../../src/constants/financialAnomaly.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../../src/constants/fulfillmentAttemptStatus.js';
import { POST_PAYMENT_INCIDENT_STATUS } from '../../src/constants/postPaymentIncidentStatus.js';
import { applyPhase1CheckoutSessionCompleted } from '../../src/services/phase1StripeCheckoutSessionCompleted.js';
import { recomputeFinancialTruthForPaymentCheckout } from '../../src/services/financialTruthService.js';
import { getCanonicalPhase1OrderForUser } from '../../src/services/canonicalPhase1OrderService.js';

if (process.env.CI === 'true' && !process.env.TEST_DATABASE_URL) {
  throw new Error('CI requires TEST_DATABASE_URL for Phase 1 money-path integration tests');
}

const dbUrl = process.env.TEST_DATABASE_URL;
const runIntegration = Boolean(dbUrl);

function checkoutSessionFixture(checkoutId, overrides = {}) {
  return {
    id: `cs_int_${randomUUID().slice(0, 8)}`,
    amount_total: 1000,
    currency: 'usd',
    payment_intent: 'pi_int_test',
    customer: 'cus_int_test',
    metadata: { internalCheckoutId: checkoutId },
    ...overrides,
  };
}

describe('Phase 1 money path (integration)', { skip: !runIntegration }, () => {
  /** @type {PrismaClient} */
  let prisma;
  /** @type {string[]} */
  const userIds = [];
  /** @type {string[]} */
  const orderIds = [];
  /** @type {string[]} */
  const eventIds = [];

  before(async () => {
    prisma = new PrismaClient({
      datasourceUrl: dbUrl,
    });
    await prisma.$connect();
  });

  after(async () => {
    if (!prisma) return;
    await prisma.$disconnect();
  });

  afterEach(async () => {
    if (!prisma) return;
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
    const email = `int_${randomUUID()}@test.invalid`;
    const u = await prisma.user.create({
      data: {
        email,
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

  async function runWebhookCheckoutSessionCompleted(/** @type {string} */ eventId, session) {
    return prisma.$transaction(async (tx) => {
      await tx.stripeWebhookEvent.create({ data: { id: eventId } });
      eventIds.push(eventId);
      return applyPhase1CheckoutSessionCompleted(tx, {
        eventId,
        session,
        log: null,
      });
    });
  }

  it('happy path: webhook paid → fee snapshot → delivered → canonical truth', async () => {
    const user = await makeUser();
    const order = await makePendingCheckout(user.id);
    const eventId = `evt_int_${randomUUID()}`;
    const session = checkoutSessionFixture(order.id);
    const r = await runWebhookCheckoutSessionCompleted(eventId, session);
    assert.equal(r.orderIdToScheduleFulfillment, order.id);
    assert.ok(r.paymentIntentIdsForFeeCapture.includes('pi_int_test'));

    const paid = await prisma.paymentCheckout.findUnique({ where: { id: order.id } });
    assert.equal(paid?.orderStatus, ORDER_STATUS.PAID);
    assert.equal(paid?.stripePaymentIntentId, 'pi_int_test');

    const att = await prisma.fulfillmentAttempt.findFirst({
      where: { orderId: order.id, attemptNumber: 1 },
    });
    assert.equal(att?.status, FULFILLMENT_ATTEMPT_STATUS.QUEUED);

    await prisma.paymentCheckout.update({
      where: { id: order.id },
      data: {
        stripeFeeActualUsdCents: 59,
        stripeBalanceTransactionAmountCents: 1000,
      },
    });
    await recomputeFinancialTruthForPaymentCheckout(order.id, null, { prisma });

    await prisma.$transaction(async (tx) => {
      await tx.fulfillmentAttempt.updateMany({
        where: { orderId: order.id },
        data: {
          status: FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED,
          providerReference: 'ref_sim_ok',
          completedAt: new Date(),
        },
      });
      await tx.paymentCheckout.update({
        where: { id: order.id },
        data: {
          orderStatus: ORDER_STATUS.FULFILLED,
          status: PAYMENT_CHECKOUT_STATUS.RECHARGE_COMPLETED,
          fulfillmentProviderReference: 'ref_sim_ok',
          fulfillmentProviderKey: 'mock',
          providerCostActualUsdCents: 800,
          providerCostTruthSource: 'provider_api',
        },
      });
    });
    await recomputeFinancialTruthForPaymentCheckout(order.id, null, { prisma });

    const dto = await getCanonicalPhase1OrderForUser(order.id, user.id, { prisma });
    assert.ok(dto);
    assert.equal(dto.lifecycleStatus, ORDER_STATUS.FULFILLED);
    assert.equal(dto.stripeFeeActualUsdCents, 59);
    assert.equal(dto.fulfillmentStatus, 'SUCCEEDED');
    assert.ok(Array.isArray(dto.financialAnomalyCodes));
  });

  it('duplicate Stripe webhook event id → idempotent DB reject (P2002)', async () => {
    const user = await makeUser();
    const order = await makePendingCheckout(user.id);
    const eventId = `evt_dup_${randomUUID()}`;
    const session = checkoutSessionFixture(order.id);
    await runWebhookCheckoutSessionCompleted(eventId, session);
    await assert.rejects(
      async () =>
        prisma.$transaction(async (tx) => {
          await tx.stripeWebhookEvent.create({ data: { id: eventId } });
        }),
      (e) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002',
    );
  });

  it('Stripe amount mismatch marks checkout failed when still pending', async () => {
    const user = await makeUser();
    const order = await makePendingCheckout(user.id);
    const eventId = `evt_mis_${randomUUID()}`;
    const session = checkoutSessionFixture(order.id, { amount_total: 999 });
    const r = await runWebhookCheckoutSessionCompleted(eventId, session);
    assert.equal(r.checkoutAmountMismatchOrderId, order.id);
    const row = await prisma.paymentCheckout.findUnique({ where: { id: order.id } });
    assert.equal(row?.orderStatus, ORDER_STATUS.FAILED);
    assert.equal(row?.failureReason, 'stripe_amount_currency_mismatch');
  });

  it('Reloadly delivered without provider cost → PROVIDER_COST_UNVERIFIED on canonical', async () => {
    const user = await makeUser();
    const order = await makePendingCheckout(user.id);
    const eventId = `evt_pc_${randomUUID()}`;
    await runWebhookCheckoutSessionCompleted(eventId, checkoutSessionFixture(order.id));
    await prisma.paymentCheckout.update({
      where: { id: order.id },
      data: {
        stripeFeeActualUsdCents: 59,
        stripeBalanceTransactionAmountCents: 1000,
      },
    });
    await prisma.$transaction(async (tx) => {
      await tx.fulfillmentAttempt.updateMany({
        where: { orderId: order.id },
        data: {
          status: FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED,
          provider: 'reloadly',
          providerReference: 'ref_rl',
          completedAt: new Date(),
        },
      });
      await tx.paymentCheckout.update({
        where: { id: order.id },
        data: {
          orderStatus: ORDER_STATUS.FULFILLED,
          status: PAYMENT_CHECKOUT_STATUS.RECHARGE_COMPLETED,
          fulfillmentProviderReference: 'ref_rl',
          fulfillmentProviderKey: 'reloadly',
          providerCostActualUsdCents: null,
          providerCostTruthSource: 'unverified',
        },
      });
    });
    await recomputeFinancialTruthForPaymentCheckout(order.id, null, { prisma });
    const dto = await getCanonicalPhase1OrderForUser(order.id, user.id, { prisma });
    assert.ok(dto?.financialAnomalyCodes.includes(FINANCIAL_ANOMALY.PROVIDER_COST_UNVERIFIED));
  });

  it('delivered without provider reference → PROVIDER_REFERENCE_MISSING', async () => {
    const user = await makeUser();
    const order = await makePendingCheckout(user.id);
    const eventId = `evt_pr_${randomUUID()}`;
    await runWebhookCheckoutSessionCompleted(eventId, checkoutSessionFixture(order.id));
    await prisma.$transaction(async (tx) => {
      await tx.fulfillmentAttempt.updateMany({
        where: { orderId: order.id },
        data: {
          status: FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED,
          providerReference: null,
          completedAt: new Date(),
        },
      });
      await tx.paymentCheckout.update({
        where: { id: order.id },
        data: {
          orderStatus: ORDER_STATUS.FULFILLED,
          status: PAYMENT_CHECKOUT_STATUS.RECHARGE_COMPLETED,
          fulfillmentProviderReference: null,
          fulfillmentProviderKey: 'mock',
          providerCostActualUsdCents: 800,
          providerCostTruthSource: 'provider_api',
        },
      });
    });
    await recomputeFinancialTruthForPaymentCheckout(order.id, null, { prisma });
    const dto = await getCanonicalPhase1OrderForUser(order.id, user.id, { prisma });
    assert.ok(dto?.financialAnomalyCodes.includes(FINANCIAL_ANOMALY.PROVIDER_REFERENCE_MISSING));
  });

  it('stuck-like paid + aged paidAt surfaces stuckSignals (fixture clock)', async () => {
    const user = await makeUser();
    const order = await makePendingCheckout(user.id);
    const eventId = `evt_stk_${randomUUID()}`;
    await runWebhookCheckoutSessionCompleted(eventId, checkoutSessionFixture(order.id));
    const ancient = new Date(Date.now() - 3 * 60 * 60 * 1000);
    await prisma.paymentCheckout.update({
      where: { id: order.id },
      data: { paidAt: ancient },
    });
    const dto = await getCanonicalPhase1OrderForUser(order.id, user.id, { prisma });
    assert.ok(dto?.stuckSignals?.length);
    assert.ok(
      dto.stuckSignals.includes('PAID_OR_PROCESSING_EXCEEDS_PROCESSING_TIMEOUT'),
    );
  });

  it('low margin after delivery → LOW_MARGIN in canonical anomaly codes', async () => {
    const user = await makeUser();
    const order = await makePendingCheckout(user.id, {
      providerCostUsdCents: 920,
      stripeFeeEstimateUsdCents: 59,
    });
    const eventId = `evt_lm_${randomUUID()}`;
    await runWebhookCheckoutSessionCompleted(eventId, checkoutSessionFixture(order.id));
    await prisma.paymentCheckout.update({
      where: { id: order.id },
      data: {
        stripeFeeActualUsdCents: 59,
        stripeBalanceTransactionAmountCents: 1000,
      },
    });
    await prisma.$transaction(async (tx) => {
      await tx.fulfillmentAttempt.updateMany({
        where: { orderId: order.id },
        data: {
          status: FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED,
          providerReference: 'ref_m',
          completedAt: new Date(),
        },
      });
      await tx.paymentCheckout.update({
        where: { id: order.id },
        data: {
          orderStatus: ORDER_STATUS.FULFILLED,
          status: PAYMENT_CHECKOUT_STATUS.RECHARGE_COMPLETED,
          fulfillmentProviderReference: 'ref_m',
          fulfillmentProviderKey: 'mock',
          providerCostActualUsdCents: 920,
          providerCostTruthSource: 'provider_api',
        },
      });
    });
    await recomputeFinancialTruthForPaymentCheckout(order.id, null, { prisma });
    const dto = await getCanonicalPhase1OrderForUser(order.id, user.id, { prisma });
    assert.ok(dto?.financialAnomalyCodes.includes(FINANCIAL_ANOMALY.LOW_MARGIN));
  });

  it('post-payment incident fields surface on canonical DTO', async () => {
    const user = await makeUser();
    const order = await makePendingCheckout(user.id);
    const eventId = `evt_pi_${randomUUID()}`;
    await runWebhookCheckoutSessionCompleted(eventId, checkoutSessionFixture(order.id));
    await prisma.paymentCheckout.update({
      where: { id: order.id },
      data: {
        postPaymentIncidentStatus: POST_PAYMENT_INCIDENT_STATUS.DISPUTED,
        postPaymentIncidentNotes: 'Stripe dispute evt (manual)',
        postPaymentIncidentUpdatedAt: new Date(),
      },
    });
    const dto = await getCanonicalPhase1OrderForUser(order.id, user.id, { prisma });
    assert.equal(dto?.postPaymentIncident?.status, POST_PAYMENT_INCIDENT_STATUS.DISPUTED);
    assert.equal(dto?.postPaymentIncident?.recordedInApp, true);
  });
});
