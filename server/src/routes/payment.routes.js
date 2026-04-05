import { Router } from 'express';
import {
  createCheckoutSession,
  createTestPaymentIntent,
} from '../controllers/paymentController.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  apiIpLimiter,
  checkoutAuthenticatedLimiter,
  topupPaymentIntentLimiter,
} from '../middleware/rateLimits.js';
import { requireJsonContentType } from '../middleware/requireJsonContentType.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { blockMoneyRoutesIfPrelaunch } from '../middleware/prelaunchMoneyBlock.js';

const router = Router();

/** Test-mode Stripe PaymentIntent for Next.js / tooling (sk_test_ only). */
router.post(
  '/create-payment-intent',
  apiIpLimiter,
  topupPaymentIntentLimiter,
  requireJsonContentType,
  asyncHandler(createTestPaymentIntent),
);

router.post(
  '/create-checkout-session',
  requireJsonContentType,
  requireAuth,
  blockMoneyRoutesIfPrelaunch,
  checkoutAuthenticatedLimiter,
  asyncHandler(createCheckoutSession),
);

export default router;
