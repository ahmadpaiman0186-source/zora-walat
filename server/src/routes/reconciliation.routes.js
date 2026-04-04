import { Router } from 'express';

import { requireAuth, requireAdmin } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { runReconciliationScan } from '../services/reconciliationService.js';

const router = Router();

/**
 * Read-only reconciliation report (admin). Does not mutate orders.
 */
router.get(
  '/reconciliation',
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const result = await runReconciliationScan();
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(result);
  }),
);

export default router;
