import { Router } from 'express';
import {
  createCheckoutSession,
  createTestPaymentIntent,
} from '../controllers/paymentController.js';
import { env } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  apiIpLimiter,
  checkoutAuthenticatedLimiter,
  paymentIntentEndpointLimiter,
  webtopTopupsPerMinuteLimiter,
} from '../middleware/rateLimits.js';
import {
  webtopAbusePreCheck,
  webtopAbuseRecordFailedPayments,
} from '../middleware/webtopAbuseProtection.js';
import { requireJsonContentType } from '../middleware/requireJsonContentType.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireEmailVerified } from '../middleware/requireEmailVerified.js';
import { optionalAuthOrRequireOwnerForMoneyAdjacency } from '../middleware/optionalAuthOrRequireOwnerForMoneyAdjacency.js';
import { blockMoneyRoutesIfPrelaunch } from '../middleware/prelaunchMoneyBlock.js';

/**
 * Email verification gate for hosted checkout. In production always enforced.
 * In non-production: skipped when `env.allowUnverifiedCheckoutInDev` (see ALLOW_UNVERIFIED_CHECKOUT).
 */
function requireEmailVerifiedForCheckout(req, res, next) {
  if (env.allowUnverifiedCheckoutInDev) {
    return next();
  }
  return requireEmailVerified(req, res, next);
}

const router = Router();

/** Embedded PaymentIntent for Next.js web top-up (test keys any env; live keys prod only). */
router.post(
  '/create-payment-intent',
  blockMoneyRoutesIfPrelaunch,
  apiIpLimiter,
  webtopTopupsPerMinuteLimiter,
  webtopAbusePreCheck,
  webtopAbuseRecordFailedPayments,
  paymentIntentEndpointLimiter,
  requireJsonContentType,
  optionalAuthOrRequireOwnerForMoneyAdjacency,
  asyncHandler(createTestPaymentIntent),
);

router.post(
  '/create-checkout-session',
  requireJsonContentType,
  requireAuth,
  requireEmailVerifiedForCheckout,
  blockMoneyRoutesIfPrelaunch,
  checkoutAuthenticatedLimiter,
  asyncHandler(createCheckoutSession),
);

export default router;
