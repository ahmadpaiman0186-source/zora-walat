import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { ORDER_STATUS } from '../src/constants/orderStatus.js';
import {
  buildSelfHealingReport,
  evaluateSystemHealth,
  quarantineUnsafeOrder,
  recoverStaleFulfillmentJobs,
} from '../src/reliability/selfHealingOrchestrator.js';
import {
  emitReliabilityFailureDetected,
  getReliabilityRecentSamples,
} from '../src/reliability/reliabilityL7Log.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const orchPath = join(__dirname, '../src/reliability/selfHealingOrchestrator.js');

describe('L7 selfHealingOrchestrator', () => {
  it('never imports ledger posting or fraud bypass modules (static guard)', () => {
    const src = readFileSync(orchPath, 'utf8');
    assert.ok(src.includes('evaluateSystemHealth'));
    assert.equal(src.includes('ledgerService'), false);
    assert.equal(src.includes('postLedger'), false);
    assert.equal(src.includes('moneyPathGuard'), false);
    assert.equal(src.includes('fraudMoneyPathGuard'), false);
  });

  it('evaluateSystemHealth: Redis probe failure does not throw', async () => {
    const prismaOk = {
      $queryRaw: async () => [1],
    };
    const r = await evaluateSystemHealth({
      prisma: /** @type {any} */ (prismaOk),
      traceId: 't-redis-skip',
    });
    assert.equal(r.dbReady, true);
    assert.ok(['ok', 'skipped', 'error'].includes(r.redisReady));
  });

  it('evaluateSystemHealth: DB failure → fail-closed recommendation', async () => {
    const prismaBad = {
      $queryRaw: async () => {
        throw new Error('connection refused');
      },
    };
    const r = await evaluateSystemHealth({
      prisma: /** @type {any} */ (prismaBad),
      traceId: 't-db-down',
    });
    assert.equal(r.dbReady, false);
    assert.equal(r.failClosedRecommendation, true);
  });

  it('recoverStaleFulfillmentJobs never schedules for non-PAID pipeline orders', async () => {
    /** @type {string[]} */
    const scheduled = [];
    const prisma = {
      fulfillmentAttempt: {
        findMany: async () => [
          { id: 'att1', orderId: 'ord_failed' },
        ],
      },
      paymentCheckout: {
        findUnique: async ({ where: { id } }) => {
          if (id === 'ord_failed')
            return { orderStatus: ORDER_STATUS.FAILED };
          return null;
        },
      },
    };
    const r = await recoverStaleFulfillmentJobs({
      prisma: /** @type {any} */ (prisma),
      staleMs: 1,
      maxOrders: 5,
      traceId: 't-block',
      scheduleFulfillmentProcessingFn: () => {
        scheduled.push('should-not-run');
      },
    });
    assert.equal(scheduled.length, 0);
    assert.equal(r.attempted, 0);
  });

  it('recoverStaleFulfillmentJobs schedules for PAID + stale PROCESSING', async () => {
    /** @type {string[]} */
    const scheduled = [];
    const prisma = {
      fulfillmentAttempt: {
        findMany: async () => [{ id: 'attx', orderId: 'ord_paid' }],
      },
      paymentCheckout: {
        findUnique: async ({ where: { id } }) => {
          if (id === 'ord_paid') return { orderStatus: ORDER_STATUS.PAID };
          return null;
        },
      },
    };
    const r = await recoverStaleFulfillmentJobs({
      prisma: /** @type {any} */ (prisma),
      staleMs: 1,
      maxOrders: 5,
      traceId: 't-ok',
      scheduleFulfillmentProcessingFn: (oid) => {
        scheduled.push(oid);
      },
    });
    assert.equal(r.attempted, 1);
    assert.deepEqual(scheduled, ['ord_paid']);
  });

  it('quarantineUnsafeOrder only touches metadata merge', async () => {
    /** @type {unknown[]} */
    const updates = [];
    const prisma = {
      paymentCheckout: {
        findUnique: async () => ({ metadata: { a: 1 } }),
        update: async ({ data }) => {
          updates.push(data);
          return {};
        },
      },
    };
    await quarantineUnsafeOrder('ord1', 'unsafe_signal', {
      prisma: /** @type {any} */ (prisma),
    });
    assert.equal(updates.length, 1);
    const d = /** @type {{ metadata?: { l7Quarantine?: { reason?: string } } }} */ (
      updates[0]
    );
    assert.ok(d.metadata?.l7Quarantine?.reason?.includes('unsafe_signal'));
  });

  it('orchestrator paymentCheckout.update is metadata-only (never writes orderStatus)', () => {
    const src = readFileSync(orchPath, 'utf8');
    const idx = src.indexOf('paymentCheckout.update');
    assert.ok(idx >= 0);
    const slice = src.slice(idx, idx + 450);
    assert.equal(slice.includes('orderStatus'), false);
  });

  it('recent failure ring survives classifier emission path', () => {
    const before = getReliabilityRecentSamples().length;
    emitReliabilityFailureDetected({
      traceId: 't1',
      failureClass: 'TEST',
      severity: 'warn',
      orderIdSuffix: 'abc123def456',
    });
    const after = getReliabilityRecentSamples();
    assert.ok(after.length >= before + 1);
  });
});
