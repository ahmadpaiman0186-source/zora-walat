import { Router } from 'express';

import { requireAuth, requireAdmin } from '../middleware/authMiddleware.js';
import { staffApiErrorBody } from '../lib/staffApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getMarginAnalyticsSummary,
  getMarginByDestination,
  getMarginByOperator,
  getMarginByProductType,
  getLowAndNegativeMarginRoutes,
  parseMarginRangeFromQuery,
} from '../services/marginAnalyticsService.js';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get(
  '/margin/summary',
  asyncHandler(async (req, res) => {
    const r = parseMarginRangeFromQuery(req.query);
    if (r.error) {
      return res.status(400).json(staffApiErrorBody(r.error, 400));
    }
    const data = await getMarginAnalyticsSummary({
      since: r.since,
      until: r.until,
    });
    res.setHeader('Cache-Control', 'no-store');
    res.json(data);
  }),
);

router.get(
  '/margin/by-operator',
  asyncHandler(async (req, res) => {
    const r = parseMarginRangeFromQuery(req.query);
    if (r.error) {
      return res.status(400).json(staffApiErrorBody(r.error, 400));
    }
    const data = await getMarginByOperator({ since: r.since, until: r.until });
    res.setHeader('Cache-Control', 'no-store');
    res.json({ operators: data });
  }),
);

router.get(
  '/margin/by-destination',
  asyncHandler(async (req, res) => {
    const r = parseMarginRangeFromQuery(req.query);
    if (r.error) {
      return res.status(400).json(staffApiErrorBody(r.error, 400));
    }
    const data = await getMarginByDestination({
      since: r.since,
      until: r.until,
    });
    res.setHeader('Cache-Control', 'no-store');
    res.json({ destinations: data });
  }),
);

router.get(
  '/margin/by-product-type',
  asyncHandler(async (req, res) => {
    const r = parseMarginRangeFromQuery(req.query);
    if (r.error) {
      return res.status(400).json(staffApiErrorBody(r.error, 400));
    }
    const data = await getMarginByProductType({
      since: r.since,
      until: r.until,
    });
    res.setHeader('Cache-Control', 'no-store');
    res.json({ productTypes: data });
  }),
);

router.get(
  '/margin/low-routes',
  asyncHandler(async (req, res) => {
    const r = parseMarginRangeFromQuery(req.query);
    if (r.error) {
      return res.status(400).json(staffApiErrorBody(r.error, 400));
    }
    const raw = parseInt(String(req.query.limit ?? '50'), 10);
    const limit = Number.isFinite(raw) ? raw : 50;
    const data = await getLowAndNegativeMarginRoutes({
      since: r.since,
      until: r.until,
      limit,
    });
    res.setHeader('Cache-Control', 'no-store');
    res.json(data);
  }),
);

export default router;
