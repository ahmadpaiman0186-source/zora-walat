import { Router } from 'express';

import { sendLivenessJsonOk } from '../lib/sendLivenessJsonOk.js';

/**
 * API-prefix router mounted at `/api` from `app.js`.
 *
 * `GET /api/health` — JSON `{ status: 'ok' }` (see `sendLivenessJsonOk`).
 * Root `GET /health` serves the same JSON contract from `health.routes.js`.
 * Readiness: root `GET /ready`; metrics: `GET /metrics`.
 *
 * **`POST /api/checkout-pricing-quote`** is defined only in `payment.routes.js` and
 * mounted via `app.use('/api', paymentRoutes)` in `app.js` (single source of truth;
 * avoids duplicating middleware chains).
 */
const router = Router();

router.get('/health', (_req, res) => {
  sendLivenessJsonOk(res);
});

export default router;
