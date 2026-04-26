import { Router } from 'express';

import { requireAuth, requireAdmin } from '../middleware/authMiddleware.js';
import { staffApiErrorBody } from '../lib/staffApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  listAdminOrders,
  inspectAdminOrder,
  retryPreviewAdminOrder,
} from '../services/adminOrdersService.js';

const router = Router();

router.get(
  '/orders',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const result = await listAdminOrders({
      limit: req.query.limit,
      orderStatus: req.query.orderStatus,
      paymentStatus: req.query.paymentStatus,
      fulfillmentStatus: req.query.fulfillmentStatus,
      attemptNumber:
        req.query.attemptNumber != null
          ? parseInt(String(req.query.attemptNumber), 10)
          : null,
    });

    if (!result.ok) {
      res
        .status(result.status ?? 400)
        .json(
          staffApiErrorBody(result.error, result.status ?? 400),
        );
      return;
    }

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({
      limit: Array.isArray(req.query.limit) ? null : req.query.limit ?? 20,
      filters: {
        orderStatus: req.query.orderStatus ?? null,
        paymentStatus: req.query.paymentStatus ?? null,
        fulfillmentStatus: req.query.fulfillmentStatus ?? null,
        attemptNumber: req.query.attemptNumber ?? null,
      },
      ...result,
    });
  }),
);

router.get(
  '/orders/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const includeAuditLogs = String(req.query.includeAuditLogs ?? 'false') === 'true';

    const result = await inspectAdminOrder({
      id: req.params.id,
      includeAuditLogs,
    });

    if (!result.ok) {
      res
        .status(result.status ?? 400)
        .json(
          staffApiErrorBody(result.error, result.status ?? 400),
        );
      return;
    }

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(result);
  }),
);

router.get(
  '/orders/:id/retry-preview',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const result = await retryPreviewAdminOrder({ id: req.params.id });
    if (!result.ok) {
      res
        .status(result.status ?? 400)
        .json(
          staffApiErrorBody(result.error, result.status ?? 400),
        );
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(result.retryPreview);
  }),
);

export default router;

