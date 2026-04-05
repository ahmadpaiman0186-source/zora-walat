import { Router } from 'express';

import * as referral from '../controllers/referralController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { authenticatedApiLimiter } from '../middleware/rateLimits.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticatedApiLimiter);
router.use(requireAuth);

router.get('/me', asyncHandler(referral.getReferralMe));
router.get('/history', asyncHandler(referral.getReferralHistory));

export default router;
