import { Router } from 'express';

import { requireAuth, requireAdmin } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  listPhase1FulfillmentDlqEntries,
  guardedReplayPhase1FulfillmentFromDlq,
} from '../services/phase1FulfillmentDlqService.js';

const router = Router();

router.get(
  '/fulfillment-dlq',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const raw = parseInt(String(req.query.limit ?? '100'), 10);
    const limit = Number.isFinite(raw) ? Math.min(200, Math.max(1, raw)) : 100;
    const entries = await listPhase1FulfillmentDlqEntries(limit);
    res.setHeader('Cache-Control', 'no-store');
    res.json({ schema: 'zora.phase1_fulfillment_dlq.v1', entries });
  }),
);

router.post(
  '/fulfillment-dlq/replay',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const orderId = String(req.body?.orderId ?? '').trim();
    const operatorReason = String(req.body?.operatorReason ?? '').trim();
    const traceId =
      typeof req.body?.traceId === 'string' && req.body.traceId.trim()
        ? req.body.traceId.trim().slice(0, 128)
        : req.traceId ?? null;
    const dryRun = req.body?.dryRun === true;
    const result = await guardedReplayPhase1FulfillmentFromDlq({
      orderId,
      operatorReason,
      traceId,
      dryRun,
    });
    res.setHeader('Cache-Control', 'no-store');
    if (!result.ok && result.dryRun !== true) {
      const status =
        result.code === 'not_found'
          ? 404
          : result.code === 'replay_guard_blocked'
            ? 409
            : 400;
      return res.status(status).json(result);
    }
    res.status(200).json(result);
  }),
);

export default router;
