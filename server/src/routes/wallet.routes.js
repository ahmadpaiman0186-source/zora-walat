import { Router } from 'express';
import * as wallet from '../controllers/walletController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireEmailVerified } from '../middleware/requireEmailVerified.js';
import { requireJsonContentType } from '../middleware/requireJsonContentType.js';
import {
  authenticatedApiLimiter,
  walletTopupLimiter,
  walletTopupPerMinuteLimiter,
} from '../middleware/rateLimits.js';
import { blockMoneyRoutesIfPrelaunch } from '../middleware/prelaunchMoneyBlock.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(requireAuth);
router.use(authenticatedApiLimiter);

router.get('/balance', asyncHandler(wallet.getBalance));
router.post(
  '/topup',
  walletTopupPerMinuteLimiter,
  walletTopupLimiter,
  requireJsonContentType,
  requireEmailVerified,
  blockMoneyRoutesIfPrelaunch,
  asyncHandler(wallet.postTopup),
);

export default router;
