import { Router } from 'express';

import * as auth from '../controllers/authController.js';
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
router.post('/refresh', requireJsonContentType, asyncHandler(auth.postRefresh));
router.post('/logout', requireJsonContentType, asyncHandler(auth.postLogout));
router.get('/me', requireAuth, asyncHandler(auth.getMe));

export default router;
