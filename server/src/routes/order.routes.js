import { Router } from 'express';

import * as order from '../controllers/orderController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { ordersReadLimiter } from '../middleware/rateLimits.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(requireAuth);
router.use(ordersReadLimiter);

router.get('/', asyncHandler(order.listOrders));
router.get(
  '/by-stripe-session/:sessionId',
  asyncHandler(order.getOrderByStripeSession),
);
router.get('/:id', asyncHandler(order.getOrderById));

export default router;
