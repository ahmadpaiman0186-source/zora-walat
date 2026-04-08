import { Router } from 'express';

import { sendLivenessJsonOk } from '../lib/sendLivenessJsonOk.js';

/**
 * API-prefix router mounted at `/api` from `app.js`.
 *
 * `GET /api/health` duplicates the root `GET /health` contract intentionally
 * (some proxies and clients only allow `/api/*`). Deep readiness stays on
 * root `GET /ready` and `GET → /metrics` (see `health.routes.js`).
 */
const router = Router();

router.get('/health', (_req, res) => {
  sendLivenessJsonOk(res);
});

export default router;
