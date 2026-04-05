import { Router } from 'express';

import { prisma } from '../db.js';
import { getWebTopupMetricsSnapshot } from '../lib/webTopupObservability.js';
import { getOpsMetricsSnapshot } from '../lib/opsMetrics.js';
import { getWebTopupFulfillmentStuckSummary } from '../services/webtopStuckOrders.js';
import { getTopupProviderCircuitSnapshot } from '../services/topupFulfillment/topupProviderCircuit.js';

const router = Router();

/** Liveness — process up (safe behind LB without hitting DB). */
router.get('/health', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ status: 'ok' });
});

/**
 * Readiness — PostgreSQL + `WebTopupOrder` storage reachable.
 * Includes in-process web top-up metrics (counters since process start).
 */
router.get('/ready', async (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  /** @type {{ database?: string, webTopupPersistence?: string }} */
  const checks = {};
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch {
    checks.database = 'failed';
    checks.webTopupPersistence = 'skipped';
    return res.status(503).json({
      status: 'unavailable',
      checks,
      webTopupMetrics: getWebTopupMetricsSnapshot(),
      opsMetrics: getOpsMetricsSnapshot(),
    });
  }
  try {
    await prisma.webTopupOrder.findFirst({ select: { id: true } });
    checks.webTopupPersistence = 'ok';
  } catch {
    checks.webTopupPersistence = 'failed';
    return res.status(503).json({
      status: 'unavailable',
      checks,
      webTopupMetrics: getWebTopupMetricsSnapshot(),
      opsMetrics: getOpsMetricsSnapshot(),
    });
  }
  let webTopupStuck = null;
  try {
    webTopupStuck = await getWebTopupFulfillmentStuckSummary();
  } catch {
    webTopupStuck = { error: 'stuck_summary_unavailable' };
  }

  /** @type {number | null} */
  let webTopupFulfillmentJobsQueued = null;
  try {
    webTopupFulfillmentJobsQueued = await prisma.webTopupFulfillmentJob.count({
      where: { status: 'queued' },
    });
  } catch {
    webTopupFulfillmentJobsQueued = null;
  }

  /** @type {Record<string, number> | { error: string }} */
  let paymentCheckoutByOrderStatus24h = {};
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const rows = await prisma.paymentCheckout.groupBy({
      by: ['orderStatus'],
      where: { updatedAt: { gte: since } },
      _count: { _all: true },
    });
    paymentCheckoutByOrderStatus24h = Object.fromEntries(
      rows.map((r) => [r.orderStatus, r._count._all]),
    );
  } catch {
    paymentCheckoutByOrderStatus24h = { error: 'payment_checkout_health_unavailable' };
  }

  return res.status(200).json({
    status: 'ready',
    checks,
    webTopupMetrics: getWebTopupMetricsSnapshot(),
    opsMetrics: getOpsMetricsSnapshot(),
    paymentCheckoutByOrderStatus24h,
    webTopupFulfillmentStuck: webTopupStuck,
    topupProviderCircuits: getTopupProviderCircuitSnapshot(),
    webTopupFulfillmentJobsQueued,
  });
});

export default router;
