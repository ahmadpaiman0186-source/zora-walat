import { Router } from 'express';
import { createCheckoutSession } from '../controllers/paymentController.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { checkoutAuthenticatedLimiter } from '../middleware/rateLimits.js';
import { requireJsonContentType } from '../middleware/requireJsonContentType.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { blockMoneyRoutesIfPrelaunch } from '../middleware/prelaunchMoneyBlock.js';

const router = Router();

router.post(
  '/create-checkout-session',
  requireJsonContentType,
  requireAuth,
  blockMoneyRoutesIfPrelaunch,
  checkoutAuthenticatedLimiter,
  asyncHandler(createCheckoutSession),
);

export default router;
