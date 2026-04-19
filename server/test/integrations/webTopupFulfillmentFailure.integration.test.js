/**
 * WEBTOPUP_FAILSIM=timeout → fulfillment fails retryably; DB + structured `fulfillment_failed`.
 *
 *   node --import ./test/integrations/preloadTestDatabaseUrl.mjs --import ./test/integrations/registerWebtopupFailsimTimeoutEnv.mjs --test test/integrations/webTopupFulfillmentFailure.integration.test.js
 */
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import { PrismaClient } from '@prisma/client';

import { PAYMENT_STATUS } from '../../src/domain/topupOrder/statuses.js';
import { FULFILLMENT_STATUS } from '../../src/domain/topupOrder/statuses.js';
import { insertTopupOrder } from '../../src/services/topupOrder/topupOrderRepository.js';
import { dispatchWebTopupFulfillment } from '../../src/services/topupFulfillment/webTopupFulfillmentService.js';

if (process.env.CI === 'true' && !process.env.TEST_DATABASE_URL) {
  throw new Error('CI requires TEST_DATABASE_URL for webtop fulfillment failure integration test');
}

const dbUrl = String(process.env.DATABASE_URL ?? '').trim();
const runIntegration = Boolean(dbUrl);

describe(
  'WebTopup fulfillment failure handling (integration, FAILSIM timeout)',
  { skip: !runIntegration },
  () => {
    /** @type {PrismaClient} */
    let prisma;
    const orderIds = [];
    /** @type {Array<Record<string, unknown>>} */
    const fulfillmentFailedEvents = [];

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

    /** @returns {import('pino').Logger} */
    function captureLog() {
      const sink = (payload) => {
        if (payload && typeof payload === 'object' && payload.event === 'fulfillment_failed') {
          fulfillmentFailedEvents.push({ ...payload });
        }
      };
      return {
        warn: sink,
        info: () => {},
        error: sink,
      };
    }

    it('sets failed + error fields and emits fulfillment_failed with retryable', async () => {
      const sessionKey = `sess_${randomUUID().slice(0, 12)}`;
      const payloadHash = createHash('sha256').update(`ff_${randomUUID()}`, 'utf8').digest('hex');
      const { record } = await insertTopupOrder(
        {
          sessionKey,
          originCountry: 'US',
          destinationCountry: 'AF',
          productType: 'airtime',
          operatorKey: 'mock:success',
          operatorLabel: 'Mock',
          phoneNumber: '70123456781',
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

      const log = captureLog();
      await dispatchWebTopupFulfillment(record.id, log);

      const row = await prisma.webTopupOrder.findUnique({ where: { id: record.id } });
      assert.equal(row?.fulfillmentStatus, FULFILLMENT_STATUS.FAILED);
      assert.equal(String(row?.fulfillmentErrorCode ?? ''), 'FAILSIM_TIMEOUT');
      assert.ok(
        String(row?.fulfillmentErrorMessageSafe ?? '').includes('Simulated timeout'),
      );
      assert.ok(row?.fulfillmentFailedAt instanceof Date);

      assert.equal(fulfillmentFailedEvents.length, 1);
      const ev = fulfillmentFailedEvents[0];
      assert.equal(ev.event, 'fulfillment_failed');
      assert.equal(ev.orderId, record.id);
      assert.equal(ev.provider, 'mock');
      assert.equal(ev.errorCode, 'FAILSIM_TIMEOUT');
      assert.equal(ev.retryable, true);
    });

    it('second dispatch is rejected (no duplicate provider attempt)', async () => {
      const sessionKey = `sess_${randomUUID().slice(0, 12)}`;
      const payloadHash = createHash('sha256').update(`ff2_${randomUUID()}`, 'utf8').digest('hex');
      const { record } = await insertTopupOrder(
        {
          sessionKey,
          originCountry: 'US',
          destinationCountry: 'AF',
          productType: 'airtime',
          operatorKey: 'mock:success',
          operatorLabel: 'Mock',
          phoneNumber: '70123456782',
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

      const log = captureLog();
      await dispatchWebTopupFulfillment(record.id, log);
      fulfillmentFailedEvents.length = 0;

      await assert.rejects(
        () => dispatchWebTopupFulfillment(record.id, log),
        (e) => {
          assert.ok(
            e.code === 'invalid_fulfillment_state' || e.code === 'duplicate_dispatch',
            `expected invalid_fulfillment_state or duplicate_dispatch, got ${e.code}`,
          );
          return true;
        },
      );

      assert.equal(fulfillmentFailedEvents.length, 0);
      const row = await prisma.webTopupOrder.findUnique({ where: { id: record.id } });
      assert.equal(row?.fulfillmentAttemptCount, 1);
    });
  },
);
