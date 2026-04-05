import { Router } from 'express';

import { prisma } from '../db.js';
import { requireAuth, requireStaff } from '../middleware/authMiddleware.js';
import { getOpsMetricsSnapshot } from '../lib/opsMetrics.js';
import { getWebTopupMetricsSnapshot } from '../lib/webTopupObservability.js';
import { safeSuffix } from '../lib/webTopupObservability.js';
import { runReconciliationScan } from '../services/reconciliationService.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';

const router = Router();

/**
 * In-process + webtopup counters (staff).
 * Query `?integrity=1` attaches read-only reconciliation summary (counts only — suitable for dashboards).
 */
router.get('/ops/summary', requireAuth, requireStaff, async (req, res) => {
  const base = {
    ops: getOpsMetricsSnapshot(),
    webTopup: getWebTopupMetricsSnapshot(),
  };
  if (String(req.query.integrity ?? '') === '1') {
    try {
      const scan = await runReconciliationScan();
      base.integrity = {
        scannedAt: scan.scannedAt,
        issueTotal: scan.summary.total,
        byIssueType: scan.summary.byIssueType,
      };
      /** @type {{ c: number }[]} */
      const manualCnt = await prisma.$queryRaw`
        SELECT COUNT(*)::int AS c
        FROM "PaymentCheckout"
        WHERE "orderStatus" = ${ORDER_STATUS.PROCESSING}
          AND metadata @> '{"processingRecovery":{"manualRequired":true}}'::jsonb
      `;
      base.manualRequiredOpen = Number(manualCnt[0]?.c ?? 0);
    } catch (e) {
      req.log?.error({ err: e }, 'ops summary integrity slice failed');
      base.integrity = { error: 'integrity_scan_failed' };
    }
  }
  res.setHeader('Cache-Control', 'no-store');
  res.json(base);
});

/**
 * Order-focused health slice for incident response (staff). Query: `?id=<paymentCheckoutId>`
 */
router.get('/ops/order-health', requireAuth, requireStaff, async (req, res) => {
  const id = String(req.query.id ?? '').trim();
  if (!id || id.length > 128) {
    return res.status(400).json({ error: 'Missing or invalid id' });
  }
  try {
    const order = await prisma.paymentCheckout.findFirst({
      where: { id },
      select: {
        id: true,
        orderStatus: true,
        status: true,
        userId: true,
        failureReason: true,
        paidAt: true,
        failedAt: true,
        cancelledAt: true,
        updatedAt: true,
        metadata: true,
      },
    });
    if (!order) {
      return res.status(404).json({ error: 'Not found' });
    }

    const attempts = await prisma.fulfillmentAttempt.findMany({
      where: { orderId: id },
      orderBy: { attemptNumber: 'asc' },
      select: {
        attemptNumber: true,
        status: true,
        failureReason: true,
        createdAt: true,
        completedAt: true,
        failedAt: true,
      },
    });

    const notifCount = await prisma.userNotification.count({
      where: { userId: order.userId, dedupeKey: { startsWith: `order:${id}:` } },
    });

    const pushDevices = await prisma.pushDevice.count({
      where: { userId: order.userId },
    });

    return res.json({
      orderRefSuffix: safeSuffix(order.id, 12),
      orderStatus: order.orderStatus,
      paymentCheckoutStatus: order.status,
      hasUser: Boolean(order.userId),
      failureReason: order.failureReason,
      paidAt: order.paidAt,
      failedAt: order.failedAt,
      cancelledAt: order.cancelledAt,
      updatedAt: order.updatedAt,
      fulfillmentAttempts: attempts.length,
      attempts: attempts.map((a) => ({
        attemptNumber: a.attemptNumber,
        status: a.status,
        failureReason: a.failureReason ? String(a.failureReason).slice(0, 200) : null,
        completedAt: a.completedAt,
        failedAt: a.failedAt,
      })),
      serverNotificationsForOrder: notifCount,
      pushDevicesForUser: pushDevices,
      processingRecovery:
        order.metadata &&
        typeof order.metadata === 'object' &&
        !Array.isArray(order.metadata) &&
        order.metadata.processingRecovery &&
        typeof order.metadata.processingRecovery === 'object'
          ? {
              manualRequired:
                order.metadata.processingRecovery.manualRequired === true,
              likelyDelivered:
                order.metadata.processingRecovery.likelyDelivered === true,
              classification:
                typeof order.metadata.processingRecovery
                  .manualRequiredClassification === 'string'
                  ? order.metadata.processingRecovery.manualRequiredClassification
                  : null,
            }
          : null,
    });
  } catch (e) {
    req.log?.error({ err: e }, 'ops order-health failed');
    return res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
