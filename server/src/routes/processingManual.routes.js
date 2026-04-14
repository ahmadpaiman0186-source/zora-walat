import { Router } from 'express';

import { INTERNAL_TOOLING_CODE } from '../constants/apiContractCodes.js';
import { clientErrorBody } from '../lib/clientErrorJson.js';
import {
  processingManualFailureBody,
  staffApiErrorBody,
} from '../lib/staffApiError.js';
import { requireAuth, requireAdmin, requireStaff } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { isLikelyPaymentCheckoutId } from '../lib/paymentCheckoutId.js';
import {
  listManualRequiredOrders,
  getManualRequiredDiagnostics,
  markManualRequiredReviewed,
  adminSafeRetryProcessingOrder,
  adminSafeFailProcessingOrder,
} from '../services/manualStuckOrderService.js';

const router = Router();

/**
 * Manual-required queue (stuck PROCESSING, ambiguous fulfillment) — staff read.
 */
router.get(
  '/processing-manual/required',
  requireAuth,
  requireStaff,
  asyncHandler(async (req, res) => {
    const limit = Math.min(
      Math.max(parseInt(String(req.query.limit ?? '50'), 10) || 50, 1),
      200,
    );
    const rows = await listManualRequiredOrders({ limit });
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({
      count: rows.length,
      items: rows,
    });
  }),
);

router.get(
  '/processing-manual/required/:orderId',
  requireAuth,
  requireStaff,
  asyncHandler(async (req, res) => {
    const orderId = req.params.orderId;
    if (!isLikelyPaymentCheckoutId(orderId)) {
      res.status(400).json(staffApiErrorBody('Invalid order id', 400));
      return;
    }
    const result = await getManualRequiredDiagnostics(orderId);
    if (!result.ok) {
      res.status(result.status ?? 404).json(processingManualFailureBody(result));
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(result);
  }),
);

router.post(
  '/processing-manual/required/:orderId/mark-reviewed',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const orderId = req.params.orderId;
    if (!isLikelyPaymentCheckoutId(orderId)) {
      res.status(400).json(staffApiErrorBody('Invalid order id', 400));
      return;
    }
    const reason =
      req.body && typeof req.body.reason === 'string' ? req.body.reason : '';
    const out = await markManualRequiredReviewed({
      orderId,
      reason,
      actorUserId: req.user.id,
      ip: req.ip ? String(req.ip).slice(0, 64) : null,
    });
    if (!out.ok) {
      res.status(out.status ?? 400).json(processingManualFailureBody(out));
      return;
    }
    res.status(200).json(out);
  }),
);

router.post(
  '/processing-manual/required/:orderId/safe-retry',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const orderId = req.params.orderId;
    if (!isLikelyPaymentCheckoutId(orderId)) {
      res.status(400).json(staffApiErrorBody('Invalid order id', 400));
      return;
    }
    const reason =
      req.body && typeof req.body.reason === 'string' ? req.body.reason : '';
    try {
      const out = await adminSafeRetryProcessingOrder({
        orderId,
        reason,
        actorUserId: req.user.id,
        ip: req.ip ? String(req.ip).slice(0, 64) : null,
      });
      if (!out.ok) {
        res.status(out.status ?? 400).json(processingManualFailureBody(out));
        return;
      }
      res.status(200).json(out);
    } catch (e) {
      if (e?.code === 'conflict') {
        const guidance =
          'Order state changed during the operation. Refresh diagnostics and try again only if still appropriate.';
        res.status(409).json(
          clientErrorBody(guidance, INTERNAL_TOOLING_CODE.PROCESSING_MANUAL_CONCURRENT_STATE, {
            guidance,
          }),
        );
        return;
      }
      throw e;
    }
  }),
);

router.post(
  '/processing-manual/required/:orderId/safe-fail',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const orderId = req.params.orderId;
    if (!isLikelyPaymentCheckoutId(orderId)) {
      res.status(400).json(staffApiErrorBody('Invalid order id', 400));
      return;
    }
    const reason =
      req.body && typeof req.body.reason === 'string' ? req.body.reason : '';
    const out = await adminSafeFailProcessingOrder({
      orderId,
      reason,
      actorUserId: req.user.id,
      ip: req.ip ? String(req.ip).slice(0, 64) : null,
    });
    if (!out.ok) {
      res.status(out.status ?? 400).json(processingManualFailureBody(out));
      return;
    }
    res.status(200).json(out);
  }),
);

export default router;
