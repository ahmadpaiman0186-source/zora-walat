import { Router } from 'express';

import * as topupOrder from '../controllers/topupOrderController.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  topupOrderCreateLimiter,
  topupOrderMarkPaidLimiter,
  topupOrderReadLimiter,
  topupOrderSessionBurstLimiter,
  webtopTopupsPerMinuteLimiter,
} from '../middleware/rateLimits.js';
import {
  webtopAbusePreCheck,
  webtopAbuseRecordFailedPayments,
} from '../middleware/webtopAbuseProtection.js';
import { requireJsonContentType } from '../middleware/requireJsonContentType.js';
import { optionalAuthOrRequireOwnerForMoneyAdjacency } from '../middleware/optionalAuthOrRequireOwnerForMoneyAdjacency.js';
import { blockMoneyRoutesIfPrelaunch } from '../middleware/prelaunchMoneyBlock.js';

/** Money-path policy table: `src/constants/moneyRoutePolicy.js`. */
const router = Router();

router.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

router.use(blockMoneyRoutesIfPrelaunch);
router.use(asyncHandler(optionalAuthOrRequireOwnerForMoneyAdjacency));

router.post(
  '/',
  webtopTopupsPerMinuteLimiter,
  webtopAbusePreCheck,
  topupOrderCreateLimiter,
  topupOrderSessionBurstLimiter,
  requireJsonContentType,
  asyncHandler(topupOrder.postCreateTopupOrder),
);

router.get('/', topupOrderReadLimiter, asyncHandler(topupOrder.listTopupOrders));

router.get('/:id', topupOrderReadLimiter, asyncHandler(topupOrder.getTopupOrder));

router.post(
  '/:id/mark-paid',
  webtopAbusePreCheck,
  webtopAbuseRecordFailedPayments,
  topupOrderMarkPaidLimiter,
  requireJsonContentType,
  asyncHandler(topupOrder.postMarkTopupOrderPaid),
);

export default router;
