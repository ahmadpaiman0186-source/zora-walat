import { Router } from 'express';

import { requireAuth, requireAdmin } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { runReconciliationScan } from '../services/reconciliationService.js';
import { reconcileWebTopupOrder } from '../services/topupOrder/webTopupReconcileService.js';
import { isValidTopupOrderId } from '../services/topupOrder/topupOrderService.js';

const router = Router();

/**
 * Read-only reconciliation report (admin). Does not mutate orders.
 */
router.get(
  '/reconciliation',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const incremental = String(req.query.incremental ?? '') === '1';
    const fullChunk = String(req.query.fullChunk ?? '') === '1';
    const fullCursorId = String(req.query.fullCursorId ?? '').trim() || null;
    const updateWatermarks = String(req.query.updateWatermarks ?? '1') !== '0';
    const heavyIntegrity = String(req.query.heavyIntegrity ?? '1') !== '0';

    const result = await runReconciliationScan({
      incremental,
      fullChunk: fullChunk
        ? { cursorId: fullCursorId, size: undefined }
        : null,
      updateWatermarks,
      heavyIntegrity,
    });
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(result);
  }),
);

/**
 * Compare stored `WebTopupOrder` vs Stripe PaymentIntent (read-only). Admin JWT required.
 */
router.get(
  '/web-topup-order/:orderId/reconcile',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    if (!isValidTopupOrderId(orderId)) {
      return res.status(400).json({ error: 'Invalid order id' });
    }
    const result = await reconcileWebTopupOrder(orderId, req.log);
    res.setHeader('Cache-Control', 'no-store');
    if (!result.ok) {
      const code = result.error === 'not_found' ? 404 : 400;
      return res.status(code).json(result);
    }
    return res.status(200).json(result);
  }),
);

export default router;
