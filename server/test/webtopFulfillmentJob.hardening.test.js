import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PAYMENT_STATUS } from '../src/domain/topupOrder/statuses.js';
import { FULFILLMENT_STATUS } from '../src/domain/topupOrder/statuses.js';
import {
  processWebTopupFulfillmentJobs,
  recoverStaleWebTopupFulfillmentJobs,
  getWebTopupFulfillmentQueueHealthSnapshot,
} from '../src/services/topupFulfillment/webtopFulfillmentJob.js';

/** `DATABASE_URL` comes from `server/.env` via `test/setupTestEnv.mjs` (`npm test` only). */
const hasDb = Boolean(process.env.DATABASE_URL);

describe('recoverStaleWebTopupFulfillmentJobs', { skip: !hasDb }, () => {
  it('re-queues processing jobs past lease', async () => {
    const { prisma } = await import('../src/db.js');
    const id = `twf_stale_${Date.now().toString(36)}`;
    const orderId = `tw_ord_stale_${Date.now().toString(36)}`;

    await prisma.webTopupFulfillmentJob.create({
      data: {
        id,
        orderId,
        dedupeKey: `twf:${orderId}:1`,
        status: 'processing',
        processingStartedAt: new Date(Date.now() - 600_000),
        nextRunAt: new Date(),
      },
    });

    try {
      const n = await recoverStaleWebTopupFulfillmentJobs({});
      assert.ok(n >= 1);
      const row = await prisma.webTopupFulfillmentJob.findUnique({ where: { id } });
      assert.equal(row?.status, 'queued');
      assert.equal(row?.processingStartedAt, null);
    } finally {
      await prisma.webTopupFulfillmentJob.deleteMany({ where: { id } });
    }
  });
});

describe('getWebTopupFulfillmentQueueHealthSnapshot', { skip: !hasDb }, () => {
  it('returns counts and config', async () => {
    const s = await getWebTopupFulfillmentQueueHealthSnapshot();
    assert.equal(typeof s.collectedAt, 'string');
    assert.ok(s.config);
    assert.equal(typeof s.config.batchSize, 'number');
    assert.ok(s.jobsByStatus);
    assert.equal(typeof s.orderFulfillment.queued, 'number');
  });
});

describe('processWebTopupFulfillmentJobs idempotency', { skip: !hasDb }, () => {
  it('second worker tick does not duplicate-complete the same job', async () => {
    const { prisma } = await import('../src/db.js');
    const orderId = `tw_ord_par_${Date.now().toString(36)}`;
    const jobId = `twf_par_${Date.now().toString(36)}`;

    await prisma.webTopupOrder.create({
      data: {
        id: orderId,
        sessionKey: `s_${orderId.slice(-8)}`,
        payloadHash: 'e'.repeat(64),
        originCountry: 'US',
        destinationCountry: 'AF',
        productType: 'airtime',
        operatorKey: 'op',
        operatorLabel: 'Op',
        phoneNumber: '700123456',
        productId: 'p',
        productName: 'P',
        selectedAmountLabel: '1',
        amountCents: 100,
        currency: 'usd',
        paymentIntentId: `pi_par_${orderId.slice(-8)}`,
        paymentStatus: PAYMENT_STATUS.PAID,
        fulfillmentStatus: FULFILLMENT_STATUS.QUEUED,
        fulfillmentProvider: 'mock',
        fulfillmentAttemptCount: 1,
        fulfillmentRequestedAt: new Date(),
        updateTokenHash: 'f'.repeat(64),
      },
    });

    await prisma.webTopupFulfillmentJob.create({
      data: {
        id: jobId,
        orderId,
        dedupeKey: `twf:${orderId}:1`,
        status: 'queued',
        nextRunAt: new Date(),
      },
    });

    const prevFail = process.env.WEBTOPUP_FAILSIM;
    process.env.WEBTOPUP_FAILSIM = '';

    try {
      await processWebTopupFulfillmentJobs({ limit: 5 });
      await processWebTopupFulfillmentJobs({ limit: 5 });

      const jobs = await prisma.webTopupFulfillmentJob.findMany({
        where: { orderId },
      });
      const completed = jobs.filter((j) => j.status === 'completed');
      assert.equal(
        completed.length,
        1,
        'exactly one completed job row for this order+attempt',
      );
    } finally {
      process.env.WEBTOPUP_FAILSIM = prevFail ?? '';
      await prisma.webTopupFulfillmentJob.deleteMany({ where: { orderId } });
      await prisma.webTopupOrder.deleteMany({ where: { id: orderId } });
    }
  });
});
