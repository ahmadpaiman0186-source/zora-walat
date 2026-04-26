import { Router } from 'express';
import {
  createCheckoutSession,
  createCheckoutPricingQuote,
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
import {
  blockMoneyRoutesIfPrelaunch,
  blockPaymentsIfLockdownMode,
} from '../middleware/prelaunchMoneyBlock.js';

/**
 * Email verification gate for hosted checkout. In production always enforced.
 * In non-production: skipped when env.allowUnverifiedCheckoutInDev.
 */
function requireEmailVerifiedForCheckout(req, res, next) {
  if (env.allowUnverifiedCheckoutInDev) {
    return next();
  }
  return requireEmailVerified(req, res, next);
}

/**
 * CI-stable guard:
 * payment lockdown must win before Stripe configuration checks.
 * This prevents create-payment-intent from returning stripe_not_configured
 * when PAYMENTS_LOCKDOWN_MODE is enabled.
 */
function enforcePaymentsLockdownBeforeStripe(req, res, next) {
  if (env.paymentsLockdownMode === true || env.paymentsLockdownMode === 'true') {
    return res.status(503).json({
      success: false,
      code: 'payments_lockdown',
      message: 'Payments are temporarily unavailable',
      error: 'Payments are temporarily unavailable',
    });
  }

  return next();
}

const router = Router();

/** Embedded PaymentIntent for Next.js web top-up (test keys any env; live keys prod only). */
router.post(
  '/create-payment-intent',
  blockMoneyRoutesIfPrelaunch,
  blockPaymentsIfLockdownMode,
  enforcePaymentsLockdownBeforeStripe,
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
  blockPaymentsIfLockdownMode,
  checkoutAuthenticatedLimiter,
  asyncHandler(createCheckoutSession),
);

/** Anonymous pricing review (rate-limited); same JSON body shape as hosted checkout. */
router.post(
  '/checkout-pricing-quote',
  requireJsonContentType,
  blockMoneyRoutesIfPrelaunch,
  apiIpLimiter,
  asyncHandler(createCheckoutPricingQuote),
);

export default router;