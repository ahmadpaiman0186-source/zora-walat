import { Router } from 'express';

import { sendLivenessJsonOk } from '../lib/sendLivenessJsonOk.js';

/**
 * API-prefix router mounted at `/api` from `app.js`.
 *
 * `GET /api/health` — JSON `{ status: 'ok' }` (see `sendLivenessJsonOk`).
 * Root `GET /health` serves the same JSON contract from `health.routes.js`.
 * Readiness: root `GET /ready`; metrics: `GET /metrics`.
 */
const router = Router();

router.get('/health', (_req, res) => {
  sendLivenessJsonOk(res);
});

export default router;
