import { Router } from 'express';

import { prisma } from '../db.js';
import { env } from '../config/env.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

/**
 * GET /api/admin/soft-launch/summary
 * Operator snapshot: owner gate, soft-launch flag, open SLA breaches (paid/processing, breached clock).
 */
router.get(
  '/soft-launch/summary',
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const openSlaBreaches = await prisma.paymentCheckout.count({
      where: {
        slaBreachedAt: { not: null },
        orderStatus: {
          in: [ORDER_STATUS.PAID, ORDER_STATUS.PROCESSING],
        },
      },
    });

    const repairingRecovery = await prisma.paymentCheckout.count({
      where: { recoveryStatus: 'repairing' },
    });

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({
      softLaunchMode: env.softLaunchMode,
      ownerGateEmailConfigured: Boolean(env.ownerAllowedEmail),
      requireOwnerEmailEnv: env.requireOwnerAllowedEmail,
      openSlaBreaches,
      recoveryRepairingCount: repairingRecovery,
      logLevel: env.logLevel,
      financialSafetyLockEnabled: env.financialSafetyLockEnabled,
      providerTruthLiveVerify: env.providerTruthLiveVerify,
      trustScoreFulfillmentBlock: env.trustScoreFulfillmentBlock,
      t: new Date().toISOString(),
    });
  }),
);

export default router;
