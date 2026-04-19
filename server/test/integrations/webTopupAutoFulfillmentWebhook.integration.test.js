/**
 * WebTopupOrder: `payment_intent.succeeded` → auto `dispatchWebTopupFulfillment` (mock provider).
 * Proves webhook schedules fulfillment after DB commit (no manual close script).
 *
 *   node --import ./test/integrations/preloadTestDatabaseUrl.mjs --import ./test/integrations/registerChaosWebhookEnv.mjs --test test/integrations/webTopupAutoFulfillmentWebhook.integration.test.js
 */
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import request from 'supertest';

import { createApp } from '../../src/app.js';
import { PAYMENT_STATUS } from '../../src/domain/topupOrder/statuses.js';
import { FULFILLMENT_STATUS } from '../../src/domain/topupOrder/statuses.js';
import { insertTopupOrder } from '../../src/services/topupOrder/topupOrderRepository.js';

if (process.env.CI === 'true' && !process.env.TEST_DATABASE_URL) {
  throw new Error(
    'CI requires TEST_DATABASE_URL for webtop auto-fulfillment webhook tests',
  );
}

const dbUrl = String(process.env.DATABASE_URL ?? '').trim();
const runIntegration = Boolean(dbUrl);

describe(
  'WebTopup auto-fulfillment on payment_intent.succeeded (integration)',
  { skip: !runIntegration },
  () => {
    /** @type {PrismaClient} */
    let prisma;
    /** @type {import('express').Express} */
    let app;
    const webhookSecret = String(process.env.STRIPE_WEBHOOK_SECRET ?? '').trim();
    const orderIds = [];
    const stripeEvtIds = [];

    before(async () => {
      prisma = new PrismaClient({ datasourceUrl: dbUrl });
      await prisma.$connect();
      app = createApp();
    });

    after(async () => {
      for (const oid of orderIds) {
        await prisma.webTopupFulfillmentIdempotency.deleteMany({
          where: { orderId: oid },
        });
        await prisma.webTopupOrder.deleteMany({ where: { id: oid } });
      }
      if (stripeEvtIds.length > 0) {
        await prisma.stripeWebhookEvent.deleteMany({
          where: { id: { in: stripeEvtIds } },
        });
      }
      if (prisma) await prisma.$disconnect();
    });

    function signAndPost(type, obj, eventId) {
      const id = eventId ?? `evt_webtop_af_${randomUUID()}`;
      stripeEvtIds.push(id);
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

    async function settle(ms = 900) {
      await new Promise((r) => setTimeout(r, ms));
    }

    it('marks paid then auto-dispatches mock fulfillment to delivered', async () => {
      const sessionKey = `sess_${randomUUID().slice(0, 12)}`;
      const payloadHash = createHash('sha256').update(`pf_${randomUUID()}`, 'utf8').digest('hex');
      const { record } = await insertTopupOrder(
        {
          sessionKey,
          originCountry: 'US',
          destinationCountry: 'AF',
          productType: 'airtime',
          operatorKey: 'mock:success',
          operatorLabel: 'Mock',
          phoneNumber: '70123456789',
          productId: 'pkg',
          productName: 'Test',
          selectedAmountLabel: '$5',
          amountCents: 500,
          currency: 'usd',
          userId: null,
        },
        randomUUID(),
        payloadHash,
      );
      orderIds.push(record.id);

      const piId = `pi_webtop_af_${randomUUID().slice(0, 8)}`;
      const { req } = signAndPost(
        'payment_intent.succeeded',
        {
          id: piId,
          object: 'payment_intent',
          status: 'succeeded',
          currency: 'usd',
          amount: 500,
          metadata: { topup_order_id: record.id },
        },
      );

      const res = await req.expect(200);
      assert.equal(res.body.received, true);
      await settle();

      const row = await prisma.webTopupOrder.findUnique({ where: { id: record.id } });
      assert.equal(row?.paymentStatus, PAYMENT_STATUS.PAID);
      assert.equal(row?.fulfillmentStatus, FULFILLMENT_STATUS.DELIVERED);
      assert.equal(row?.fulfillmentProvider, 'mock');
      assert.ok(
        row?.fulfillmentReference && String(row.fulfillmentReference).length > 0,
      );
    });

    it('duplicate Stripe event id does not double-fulfill', async () => {
      const sessionKey = `sess_${randomUUID().slice(0, 12)}`;
      const payloadHash = createHash('sha256').update(`pf_${randomUUID()}`, 'utf8').digest('hex');
      const { record } = await insertTopupOrder(
        {
          sessionKey,
          originCountry: 'US',
          destinationCountry: 'AF',
          productType: 'airtime',
          operatorKey: 'mock:success',
          operatorLabel: 'Mock',
          phoneNumber: '70123456788',
          productId: 'pkg',
          productName: 'Test',
          selectedAmountLabel: '$5',
          amountCents: 500,
          currency: 'usd',
          userId: null,
        },
        randomUUID(),
        payloadHash,
      );
      orderIds.push(record.id);

      const piId = `pi_webtop_dup_${randomUUID().slice(0, 8)}`;
      const eventId = `evt_webtop_dup_${randomUUID()}`;
      const mk = () =>
        signAndPost(
          'payment_intent.succeeded',
          {
            id: piId,
            object: 'payment_intent',
            status: 'succeeded',
            currency: 'usd',
            amount: 500,
            metadata: { topup_order_id: record.id },
          },
          eventId,
        );

      await mk().req.expect(200);
      await mk().req.expect(200);
      await settle();

      const row = await prisma.webTopupOrder.findUnique({ where: { id: record.id } });
      assert.equal(row?.fulfillmentStatus, FULFILLMENT_STATUS.DELIVERED);
      assert.equal(row?.fulfillmentAttemptCount, 1);
    });
  },
);
