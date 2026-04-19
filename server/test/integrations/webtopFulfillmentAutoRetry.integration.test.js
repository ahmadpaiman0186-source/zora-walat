/**
 * Auto-retry worker: FAILED + retryable + due nextRetryAt → re-dispatch.
 *
 *   node --import ./test/integrations/preloadTestDatabaseUrl.mjs --import ./test/integrations/registerWebtopupAutoRetryFastEnv.mjs --test test/integrations/webtopFulfillmentAutoRetry.integration.test.js
 */
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import { PrismaClient } from '@prisma/client';

import { PAYMENT_STATUS } from '../../src/domain/topupOrder/statuses.js';
import { FULFILLMENT_STATUS } from '../../src/domain/topupOrder/statuses.js';
import { insertTopupOrder } from '../../src/services/topupOrder/topupOrderRepository.js';
import { dispatchWebTopupFulfillment } from '../../src/services/topupFulfillment/webTopupFulfillmentService.js';
import { processWebTopupFulfillmentAutoRetries } from '../../src/services/topupFulfillment/webtopFulfillmentAutoRetryWorker.js';

if (process.env.CI === 'true' && !process.env.TEST_DATABASE_URL) {
  throw new Error('CI requires TEST_DATABASE_URL for webtop auto-retry integration test');
}

const dbUrl = String(process.env.DATABASE_URL ?? '').trim();
const runIntegration = Boolean(dbUrl);

describe(
  'WebTopup fulfillment auto-retry worker (integration)',
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
        await prisma.webTopupOrder.deleteMany({ where: { id: oid } });
      }
      if (prisma) await prisma.$disconnect();
    });

    function captureLog() {
      /** @type {string[]} */
      const attempts = [];
      return {
        log: {
          info: (payload) => {
            if (payload?.event === 'fulfillment_retry_attempt') attempts.push('attempt');
          },
          warn: () => {},
          error: () => {},
        },
        attempts,
      };
    }

    it('schedules nextRetryAt on retryable failure then worker re-dispatches', async () => {
      const sessionKey = `sess_${randomUUID().slice(0, 12)}`;
      const payloadHash = createHash('sha256').update(`ar_${randomUUID()}`, 'utf8').digest('hex');
      const { record } = await insertTopupOrder(
        {
          sessionKey,
          originCountry: 'US',
          destinationCountry: 'AF',
          productType: 'airtime',
          operatorKey: 'mock:success',
          operatorLabel: 'Mock',
          phoneNumber: '70123456790',
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

      await prisma.webTopupOrder.update({
        where: { id: record.id },
        data: { paymentStatus: PAYMENT_STATUS.PAID },
      });

      await dispatchWebTopupFulfillment(record.id, undefined);

      const afterFail = await prisma.webTopupOrder.findUnique({ where: { id: record.id } });
      assert.equal(afterFail?.fulfillmentStatus, FULFILLMENT_STATUS.FAILED);
      assert.equal(afterFail?.fulfillmentErrorCode, 'FAILSIM_TIMEOUT');
      assert.ok(afterFail?.fulfillmentNextRetryAt instanceof Date);

      await prisma.webTopupOrder.update({
        where: { id: record.id },
        data: { fulfillmentNextRetryAt: new Date(Date.now() - 1) },
      });

      const { log, attempts } = captureLog();
      const r = await processWebTopupFulfillmentAutoRetries({ log, limit: 5 });
      assert.equal(r.dispatched, 1);
      assert.equal(attempts.length, 1);

      const afterRetry = await prisma.webTopupOrder.findUnique({ where: { id: record.id } });
      assert.equal(afterRetry?.fulfillmentAttemptCount, 2);
      assert.equal(afterRetry?.fulfillmentStatus, FULFILLMENT_STATUS.FAILED);
    });

    it('stops scheduling after max dispatch attempts', async () => {
      const sessionKey = `sess_${randomUUID().slice(0, 12)}`;
      const payloadHash = createHash('sha256').update(`ar2_${randomUUID()}`, 'utf8').digest('hex');
      const { record } = await insertTopupOrder(
        {
          sessionKey,
          originCountry: 'US',
          destinationCountry: 'AF',
          productType: 'airtime',
          operatorKey: 'mock:success',
          operatorLabel: 'Mock',
          phoneNumber: '70123456791',
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

      await prisma.webTopupOrder.update({
        where: { id: record.id },
        data: { paymentStatus: PAYMENT_STATUS.PAID },
      });

      await dispatchWebTopupFulfillment(record.id, undefined);
      await prisma.webTopupOrder.update({
        where: { id: record.id },
        data: { fulfillmentNextRetryAt: new Date(Date.now() - 1) },
      });
      await processWebTopupFulfillmentAutoRetries({ limit: 5 });
      await prisma.webTopupOrder.update({
        where: { id: record.id },
        data: { fulfillmentNextRetryAt: new Date(Date.now() - 1) },
      });
      await processWebTopupFulfillmentAutoRetries({ limit: 5 });

      const fin = await prisma.webTopupOrder.findUnique({ where: { id: record.id } });
      assert.equal(fin?.fulfillmentAttemptCount, 3);
      assert.equal(fin?.fulfillmentNextRetryAt, null);
    });
  },
);
