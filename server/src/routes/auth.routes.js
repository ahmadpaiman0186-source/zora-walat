import { Router } from 'express';

import * as auth from '../controllers/authController.js';
import {
  otpRequestEndpointLimiter,
  otpVerifyEndpointLimiter,
} from '../middleware/rateLimits.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireJsonContentType } from '../middleware/requireJsonContentType.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { blockPublicRegistrationIfPrelaunch } from '../middleware/prelaunchPublicRegistrationBlock.js';
import {
  ownerOnlyAuthEmailBodyMiddleware,
  ownerOnlyRefreshOrLogoutBodyMiddleware,
} from '../middleware/ownerOnlyAccessGuard.js';

const router = Router();

router.post(
  '/register',
  blockPublicRegistrationIfPrelaunch,
  ownerOnlyAuthEmailBodyMiddleware,
  requireJsonContentType,
  asyncHandler(auth.postRegister),
);
router.post(
  '/login',
  ownerOnlyAuthEmailBodyMiddleware,
  requireJsonContentType,
  asyncHandler(auth.postLogin),
);
router.post(
  '/request-otp',
  ownerOnlyAuthEmailBodyMiddleware,
  otpRequestEndpointLimiter,
  requireJsonContentType,
  asyncHandler(auth.postRequestOtp),
);
router.post(
  '/resend-otp',
  ownerOnlyAuthEmailBodyMiddleware,
  otpRequestEndpointLimiter,
  requireJsonContentType,
  asyncHandler(auth.postResendOtp),
);
router.post(
  '/verify-otp',
  ownerOnlyAuthEmailBodyMiddleware,
  otpVerifyEndpointLimiter,
  requireJsonContentType,
  asyncHandler(auth.postVerifyOtp),
);
router.post(
  '/refresh',
  ownerOnlyRefreshOrLogoutBodyMiddleware,
  requireJsonContentType,
  asyncHandler(auth.postRefresh),
);
router.post(
  '/logout',
  ownerOnlyRefreshOrLogoutBodyMiddleware,
  requireJsonContentType,
  asyncHandler(auth.postLogout),
);
router.get('/me', requireAuth, asyncHandler(auth.getMe));

export default router;
