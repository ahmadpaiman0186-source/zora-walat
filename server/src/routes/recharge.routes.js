import { Router } from 'express';
import * as recharge from '../controllers/rechargeController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireJsonContentType } from '../middleware/requireJsonContentType.js';
import { authenticatedApiLimiter } from '../middleware/rateLimits.js';
import { blockMoneyRoutesIfPrelaunch } from '../middleware/prelaunchMoneyBlock.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(requireAuth);
router.use(authenticatedApiLimiter);

router.post('/quote', requireJsonContentType, asyncHandler(recharge.postQuote));
router.post(
  '/order',
  requireJsonContentType,
  blockMoneyRoutesIfPrelaunch,
  asyncHandler(recharge.postOrder),
);

/** Post-payment: kick or poll airtime fulfillment (auth + owns order). Not blocked in pre-launch. */
router.post(
  '/execute',
  requireJsonContentType,
  asyncHandler(recharge.postExecute),
);

export default router;
