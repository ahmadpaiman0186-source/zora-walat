import { Router } from 'express';

import { prisma } from '../db.js';
import { requireAuth, requireStaff } from '../middleware/authMiddleware.js';
import { getOpsMetricsSnapshot } from '../lib/opsMetrics.js';
import { getWebTopupMetricsSnapshot } from '../lib/webTopupObservability.js';
import { safeSuffix } from '../lib/webTopupObservability.js';

const router = Router();

/** In-process + webtopup counters (staff). */
router.get('/ops/summary', requireAuth, requireStaff, (_req, res) => {
  res.json({
    ops: getOpsMetricsSnapshot(),
    webTopup: getWebTopupMetricsSnapshot(),
  });
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
    });
  } catch (e) {
    req.log?.error({ err: e }, 'ops order-health failed');
    return res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
