import { Router } from 'express';

import * as topupOrder from '../controllers/topupOrderController.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  topupOrderCreateLimiter,
  topupOrderMarkPaidLimiter,
  topupOrderReadLimiter,
  topupOrderSessionBurstLimiter,
} from '../middleware/rateLimits.js';
import { requireJsonContentType } from '../middleware/requireJsonContentType.js';
import { optionalAuth } from '../middleware/optionalAuth.js';

/** Money-path policy table: `src/constants/moneyRoutePolicy.js`. */
const router = Router();

router.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

router.use(asyncHandler(optionalAuth));

router.post(
  '/',
  topupOrderCreateLimiter,
  topupOrderSessionBurstLimiter,
  requireJsonContentType,
  asyncHandler(topupOrder.postCreateTopupOrder),
);

router.get('/', topupOrderReadLimiter, asyncHandler(topupOrder.listTopupOrders));

router.get('/:id', topupOrderReadLimiter, asyncHandler(topupOrder.getTopupOrder));

router.post(
  '/:id/mark-paid',
  topupOrderMarkPaidLimiter,
  requireJsonContentType,
  asyncHandler(topupOrder.postMarkTopupOrderPaid),
);

export default router;
