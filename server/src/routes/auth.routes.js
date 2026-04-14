import { Router } from 'express';

import * as auth from '../controllers/authController.js';
import {
  otpRequestEndpointLimiter,
  otpVerifyEndpointLimiter,
} from '../middleware/rateLimits.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireJsonContentType } from '../middleware/requireJsonContentType.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.post(
  '/register',
  requireJsonContentType,
  asyncHandler(auth.postRegister),
);
router.post('/login', requireJsonContentType, asyncHandler(auth.postLogin));
router.post(
  '/request-otp',
  otpRequestEndpointLimiter,
  requireJsonContentType,
  asyncHandler(auth.postRequestOtp),
);
router.post(
  '/resend-otp',
  otpRequestEndpointLimiter,
  requireJsonContentType,
  asyncHandler(auth.postResendOtp),
);
router.post(
  '/verify-otp',
  otpVerifyEndpointLimiter,
  requireJsonContentType,
  asyncHandler(auth.postVerifyOtp),
);
router.post('/refresh', requireJsonContentType, asyncHandler(auth.postRefresh));
router.post('/logout', requireJsonContentType, asyncHandler(auth.postLogout));
router.get('/me', requireAuth, asyncHandler(auth.getMe));

export default router;
