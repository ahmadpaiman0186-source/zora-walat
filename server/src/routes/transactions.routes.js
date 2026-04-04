import { Router } from 'express';

import { requireAuth } from '../middleware/authMiddleware.js';
import { ordersReadLimiter } from '../middleware/rateLimits.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  listTransactions,
  getTransaction,
} from '../controllers/transactionsController.js';

const router = Router();

router.use(requireAuth);
router.use(ordersReadLimiter);

router.get('/', asyncHandler(listTransactions));
router.get('/:id', asyncHandler(getTransaction));

export default router;

