import { Router } from 'express';

import * as loyalty from '../controllers/loyaltyController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireJsonContentType } from '../middleware/requireJsonContentType.js';
import { authenticatedApiLimiter } from '../middleware/rateLimits.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticatedApiLimiter);
router.use(requireAuth);

router.get('/summary', asyncHandler(loyalty.getSummary));
router.get('/tiers', asyncHandler(loyalty.getTiers));
router.get('/leaderboard', asyncHandler(loyalty.getLeaderboardHandler));

router.get('/groups/me', asyncHandler(loyalty.getMyGroup));
router.post('/groups', requireJsonContentType, asyncHandler(loyalty.postCreateGroup));
router.post('/groups/join', requireJsonContentType, asyncHandler(loyalty.postJoinGroup));
router.post('/groups/dissolve', asyncHandler(loyalty.postDissolveGroup));
router.post('/groups/leave', asyncHandler(loyalty.postLeaveGroup));

export default router;
