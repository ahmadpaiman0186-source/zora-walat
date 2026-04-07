/**
 * Chaos-style + incident simulations for Phase 1 (PostgreSQL).
 * Requires TEST_DATABASE_URL.
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
import { POST_PAYMENT_INCIDENT_MAP_SOURCE } from '../../src/constants/postPaymentIncidentMapSource.js';
import { PHASE1_CANONICAL_PHASE } from '../../src/services/canonicalPhase1Lifecycle.js';
import { applyPhase1CheckoutSessionCompleted } from '../../src/services/phase1StripeCheckoutSessionCompleted.js';
import {
  applyPhase1ChargeRefunded,
  applyPhase1DisputeCreated,
} from '../../src/services/phase1StripeChargeIncidents.js';
import { ensureQueuedFulfillmentAttempt } from '../../src/services/fulfillmentProcessingService.js';
import { getCanonicalPhase1OrderForUser } from '../../src/services/canonicalPhase1OrderService.js';

if (process.env.CI === 'true' && !process.env.TEST_DATABASE_URL) {
  throw new Error('CI requires TEST_DATABASE_URL');
}

const dbUrl = process.env.TEST_DATABASE_URL;
const runIntegration = Boolean(dbUrl);

function checkoutSessionFixture(checkoutId, overrides = {}) {
  return {
    id: `cs_chaos_${randomUUID().slice(0, 8)}`,
    amount_total: 1000,
    currency: 'usd',
    payment_intent: 'pi_chaos',
    customer: 'cus_chaos',
    metadata: { internalCheckoutId: checkoutId },
    ...overrides,
  };
}

describe('Phase 1 resilience (integration)', { skip: !runIntegration }, () => {
  /** @type {PrismaClient} */
  let prisma;
  const userIds = [];
  const orderIds = [];
  const eventIds = [];

  before(async () => {
    prisma = new PrismaClient({ datasourceUrl: dbUrl });
    await prisma.$connect();
  });

  after(async () => {
    if (prisma) await prisma.$disconnect();
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
    const u = await prisma.user.create({
      data: {
        email: `chaos_${randomUUID()}@test.invalid`,
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

  async function runPaidWebhook(eventId, session) {
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

  it('chaos: replay checkout.session.completed with new event id does not duplicate fulfillment attempts', async () => {
    const user = await makeUser();
    const order = await makePendingCheckout(user.id);
    const session = checkoutSessionFixture(order.id, { payment_intent: 'pi_replay' });
    const evt1 = `evt_chaos_a_${randomUUID()}`;
    await runPaidWebhook(evt1, session);
    const evt2 = `evt_chaos_b_${randomUUID()}`;
    await prisma.$transaction(async (tx) => {
      await tx.stripeWebhookEvent.create({ data: { id: evt2 } });
      eventIds.push(evt2);
      await applyPhase1CheckoutSessionCompleted(tx, {
        eventId: evt2,
        session,
        log: null,
      });
    });
    const n = await prisma.fulfillmentAttempt.count({ where: { orderId: order.id } });
    assert.equal(n, 1);
    const ord = await prisma.paymentCheckout.findUnique({ where: { id: order.id } });
    assert.equal(ord?.orderStatus, ORDER_STATUS.PAID);
    assert.equal(ord?.completedByWebhookEventId, evt1);
  });

  it('chaos: ensureQueuedFulfillmentAttempt is idempotent (no duplicate rows)', async () => {
    const user = await makeUser();
    const order = await makePendingCheckout(user.id);
    const session = checkoutSessionFixture(order.id);
    const evt1 = `evt_q_${randomUUID()}`;
    await runPaidWebhook(evt1, session);
    await prisma.$transaction(async (tx) => {
      await ensureQueuedFulfillmentAttempt(tx, order.id);
      await ensureQueuedFulfillmentAttempt(tx, order.id);
    });
    const n = await prisma.fulfillmentAttempt.count({ where: { orderId: order.id } });
    assert.equal(n, 1);
  });

  it('stripe charge.refunded updates postPaymentIncident on canonical read', async () => {
    const user = await makeUser();
    const order = await makePendingCheckout(user.id);
    await prisma.paymentCheckout.update({
      where: { id: order.id },
      data: {
        orderStatus: ORDER_STATUS.FULFILLED,
        status: PAYMENT_CHECKOUT_STATUS.RECHARGE_COMPLETED,
        stripePaymentIntentId: 'pi_refund_chaos',
      },
    });
    const evt = `evt_rf_${randomUUID()}`;
    await prisma.$transaction(async (tx) => {
      await tx.stripeWebhookEvent.create({ data: { id: evt } });
      eventIds.push(evt);
      await applyPhase1ChargeRefunded(
        tx,
        { id: 'ch_test', payment_intent: 'pi_refund_chaos' },
        evt,
      );
    });
    const dto = await getCanonicalPhase1OrderForUser(order.id, user.id, { prisma });
    assert.equal(dto.postPaymentIncident.status, POST_PAYMENT_INCIDENT_STATUS.REFUNDED);
    assert.equal(dto.postPaymentIncident.mapSource, POST_PAYMENT_INCIDENT_MAP_SOURCE.REFUND_CHARGE_PAYLOAD);
  });

  it('stripe charge.dispute.created updates postPaymentIncident', async () => {
    const user = await makeUser();
    const order = await makePendingCheckout(user.id);
    await prisma.paymentCheckout.update({
      where: { id: order.id },
      data: {
        orderStatus: ORDER_STATUS.PAID,
        status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
        stripePaymentIntentId: 'pi_dsp_chaos',
      },
    });
    const evt = `evt_dsp_${randomUUID()}`;
    await prisma.$transaction(async (tx) => {
      await tx.stripeWebhookEvent.create({ data: { id: evt } });
      eventIds.push(evt);
      await applyPhase1DisputeCreated(
        tx,
        { id: 'dp_test', payment_intent: 'pi_dsp_chaos' },
        evt,
      );
    });
    const dto = await getCanonicalPhase1OrderForUser(order.id, user.id, { prisma });
    assert.equal(dto.postPaymentIncident.status, POST_PAYMENT_INCIDENT_STATUS.DISPUTED);
    assert.equal(dto.postPaymentIncident.mapSource, POST_PAYMENT_INCIDENT_MAP_SOURCE.DISPUTE_PAYLOAD_PI);
    assert.equal(dto.postPaymentIncident.disputeSupportMapping, 'direct_from_stripe_dispute_payload');
  });

  it('stripe charge.dispute.created maps payment_intent via charges.retrieve when omitted on dispute', async () => {
    const user = await makeUser();
    const order = await makePendingCheckout(user.id);
    await prisma.paymentCheckout.update({
      where: { id: order.id },
      data: {
        orderStatus: ORDER_STATUS.PAID,
        status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
        stripePaymentIntentId: 'pi_from_charge_lookup',
      },
    });
    const evt = `evt_dsp_lookup_${randomUUID()}`;
    const mockStripe = {
      charges: {
        retrieve: async () => ({
          id: 'ch_lookup_sim',
          object: 'charge',
          payment_intent: 'pi_from_charge_lookup',
        }),
      },
    };
    await prisma.$transaction(async (tx) => {
      await tx.stripeWebhookEvent.create({ data: { id: evt } });
      eventIds.push(evt);
      await applyPhase1DisputeCreated(
        tx,
        { id: 'dp_lookup', object: 'dispute', charge: 'ch_lookup_sim' },
        evt,
        { stripe: /** @type {import('stripe').Stripe} */ (/** @type {unknown} */ (mockStripe)) },
      );
    });
    const dto = await getCanonicalPhase1OrderForUser(order.id, user.id, { prisma });
    assert.equal(dto.postPaymentIncident.status, POST_PAYMENT_INCIDENT_STATUS.DISPUTED);
    assert.equal(dto.postPaymentIncident.mapSource, POST_PAYMENT_INCIDENT_MAP_SOURCE.DISPUTE_CHARGE_LOOKUP);
    assert.equal(dto.postPaymentIncident.disputeSupportMapping, 'recovered_via_stripe_charge_api');
  });

  it('incident: terminal failure is reflected in canonical phase', async () => {
    const user = await makeUser();
    const order = await makePendingCheckout(user.id);
    await prisma.paymentCheckout.update({
      where: { id: order.id },
      data: {
        orderStatus: ORDER_STATUS.FAILED,
        status: PAYMENT_CHECKOUT_STATUS.PAYMENT_FAILED,
        failureReason: 'airtime_provider_failure_sim',
      },
    });
    const dto = await getCanonicalPhase1OrderForUser(order.id, user.id, { prisma });
    assert.equal(dto.canonicalPhase, PHASE1_CANONICAL_PHASE.FAILED);
    assert.ok(dto.lifecycleSummary.detail.includes('airtime_provider_failure_sim'));
  });

  it('incident: processing with failed latest attempt yields stuck signal', async () => {
    const user = await makeUser();
    const order = await makePendingCheckout(user.id);
    const session = checkoutSessionFixture(order.id);
    await runPaidWebhook(`evt_inc_${randomUUID()}`, session);
    await prisma.$transaction(async (tx) => {
      await tx.paymentCheckout.update({
        where: { id: order.id },
        data: {
          orderStatus: ORDER_STATUS.PROCESSING,
          status: PAYMENT_CHECKOUT_STATUS.RECHARGE_PENDING,
        },
      });
      await tx.fulfillmentAttempt.updateMany({
        where: { orderId: order.id },
        data: {
          status: FULFILLMENT_ATTEMPT_STATUS.FAILED,
          failureReason: 'simulated_provider_fail',
        },
      });
    });
    const dto = await getCanonicalPhase1OrderForUser(order.id, user.id, { prisma });
    assert.ok(dto.stuckSignals.includes('LAST_ATTEMPT_FAILED_ORDER_STILL_PROCESSING'));
  });

  it('partial flow: never-paid checkout stays awaiting payment in canonical phase', async () => {
    const user = await makeUser();
    const order = await makePendingCheckout(user.id);
    const dto = await getCanonicalPhase1OrderForUser(order.id, user.id, { prisma });
    assert.equal(dto.canonicalPhase, PHASE1_CANONICAL_PHASE.AWAITING_PAYMENT);
  });
});
