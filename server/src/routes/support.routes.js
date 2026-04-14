import { Router } from 'express';

import { API_CONTRACT_CODE } from '../constants/apiContractCodes.js';
import { clientErrorBody } from '../lib/clientErrorJson.js';
import { requireAuth, requireStaff } from '../middleware/authMiddleware.js';
import { staffPrivilegedLimiter } from '../middleware/rateLimits.js';
import { staffApiErrorBody } from '../lib/staffApiError.js';
import { buildSupportOrderFullTrace } from '../services/phase1SupportTraceService.js';

const router = Router();

/**
 * Single support payload: canonical Phase 1 order + audits + fulfillment + timeline.
 * GET /api/admin/support/order/:id/full-trace
 */
router.get(
  '/support/order/:id/full-trace',
  requireAuth,
  requireStaff,
  staffPrivilegedLimiter,
  async (req, res) => {
    const id = String(req.params.id ?? '').trim();
    if (!id || id.length > 128) {
      return res.status(400).json(staffApiErrorBody('Invalid order id', 400));
    }
    try {
      const trace = await buildSupportOrderFullTrace(id);
      if (!trace) {
        return res.status(404).json(staffApiErrorBody('Not found', 404));
      }
      req.log?.info?.(
        { traceId: req.traceId, kind: 'support_full_trace', orderIdSuffix: id.slice(-12) },
        'support_full_trace',
      );
      res.setHeader('Cache-Control', 'no-store');
      return res.json(trace);
    } catch (e) {
      req.log?.error({ err: e }, 'support_full_trace_failed');
      return res
        .status(500)
        .json(
          clientErrorBody(
            'Internal error',
            API_CONTRACT_CODE.INTERNAL_ERROR,
          ),
        );
    }
  },
);

export default router;
