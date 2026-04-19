/**
 * Fallback poller marks PAID using handleWebTopupPaymentIntentSucceeded (no POST /webhooks/stripe).
 *
 *   node --import ./test/integrations/preloadTestDatabaseUrl.mjs --test test/integrations/webTopupStripeFallbackPoller.integration.test.js
 */
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import { PrismaClient } from '@prisma/client';

import { PAYMENT_STATUS } from '../../src/domain/topupOrder/statuses.js';
import { insertTopupOrder } from '../../src/services/topupOrder/topupOrderRepository.js';
import { runWebTopupStripeFallbackPoller } from '../../src/services/topupOrder/webtopupStripeFallbackPoller.js';

if (process.env.CI === 'true' && !process.env.TEST_DATABASE_URL) {
  throw new Error(
    'CI requires TEST_DATABASE_URL for webTopupStripeFallbackPoller integration tests',
  );
}

const dbUrl = String(process.env.DATABASE_URL ?? '').trim();
const runIntegration = Boolean(dbUrl);

describe(
  'WebTopup Stripe fallback poller (integration)',
  { skip: !runIntegration },
  () => {
    /** @type {PrismaClient} */
    let prisma;
    const orderIds = [];

    before(async () => {
      prisma = new PrismaClient({ datasourceUrl: dbUrl });
      await prisma.$connect();
    });

    after(async () => {
      for (const oid of orderIds) {
        await prisma.webTopupFulfillmentIdempotency.deleteMany({
          where: { orderId: oid },
        });
        await prisma.webTopupFulfillmentJob.deleteMany({ where: { orderId: oid } });
        await prisma.webTopupOrder.deleteMany({ where: { id: oid } });
      }
      if (prisma) await prisma.$disconnect();
    });

    async function settle(ms = 900) {
      await new Promise((r) => setTimeout(r, ms));
    }

    it('marks PAID via fallback without webhook (evt_zw_fallback_ correlation)', async () => {
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
          phoneNumber: '70123456701',
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

      const piId = `pi_zw_fb_${randomUUID().slice(0, 8)}`;
      await prisma.webTopupOrder.update({
        where: { id: record.id },
        data: {
          paymentIntentId: piId,
          createdAt: new Date(Date.now() - 120_000),
        },
      });

      const r = await runWebTopupStripeFallbackPoller({
        forceRun: true,
        minOrderAgeMs: 1_000,
        retrievePaymentIntent: async () => ({
          id: piId,
          object: 'payment_intent',
          status: 'succeeded',
          amount: 500,
          currency: 'usd',
          metadata: { topup_order_id: record.id },
        }),
      });

      assert.equal(r.ran, true);
      assert.ok(r.processed >= 1);

      await settle(1200);

      const row = await prisma.webTopupOrder.findUnique({ where: { id: record.id } });
      assert.equal(row?.paymentStatus, PAYMENT_STATUS.PAID);
      assert.ok(String(row?.completedByStripeEventId ?? '').startsWith('evt_zw_fallback_'));
    });
  },
);
