import { Router } from 'express';

import { requireAuth, requireAdmin } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { runReconciliationScan } from '../services/reconciliationService.js';
import { runPhase1MoneyFulfillmentReconciliationScan } from '../services/phase1MoneyFulfillmentReconciliationEngine.js';
import { reconcileWebTopupOrder } from '../services/topupOrder/webTopupReconcileService.js';
import { isValidTopupOrderId } from '../services/topupOrder/topupOrderService.js';

const router = Router();

/**
 * Read-only reconciliation report (admin). Does not mutate orders.
 */
/**
 * Phase 1 PaymentCheckout ↔ fulfillment divergence (foundation engine; read-only).
 */
router.get(
  '/reconciliation/phase1-fulfillment',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const raw = parseInt(String(req.query.limit ?? '50'), 10);
    const limit = Number.isFinite(raw) ? Math.min(500, Math.max(1, raw)) : 50;
    const paidIdle = parseInt(String(req.query.paidIdleMs ?? '120000'), 10);
    const paidIdleMs = Number.isFinite(paidIdle) ? Math.min(3_600_000, Math.max(10_000, paidIdle)) : 120_000;
    const report = await runPhase1MoneyFulfillmentReconciliationScan({
      limit,
      paidIdleMs,
    });
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(report);
  }),
);

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
