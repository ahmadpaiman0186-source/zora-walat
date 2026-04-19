import { Router } from 'express';

import { opsInfraHealthTokenMatches } from '../middleware/opsInfraHealthGate.js';
import { queryWebTopupObservations } from '../lib/webTopupObservability.js';

const router = Router();

/**
 * In-process webtop structured observation buffer (not durable; dev/ops aid).
 * Requires `OPS_HEALTH_TOKEN` / `OPS_INFRA_HEALTH_TOKEN` as `Authorization: Bearer …` or `X-ZW-Ops-Token`.
 *
 * GET /internal/logs/webtopup?orderId=tw_ord_…&limit=100
 * GET /internal/logs/webtopup?paymentIntentIdSuffix=…&limit=50
 */
router.get('/logs/webtopup', (req, res) => {
  if (!opsInfraHealthTokenMatches(req)) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(401).json({
      ok: false,
      error: 'unauthorized',
      hint: 'Set Authorization: Bearer <OPS_HEALTH_TOKEN> or X-ZW-Ops-Token',
    });
  }

  const orderId = String(req.query.orderId ?? '').trim();
  const paymentIntentIdSuffix = String(req.query.paymentIntentIdSuffix ?? '').trim();
  const limitRaw = parseInt(String(req.query.limit ?? '100'), 10);
  const limit = Number.isFinite(limitRaw) ? limitRaw : 100;

  if (!orderId && !paymentIntentIdSuffix) {
    return res.status(400).json({
      ok: false,
      error: 'orderId or paymentIntentIdSuffix required',
    });
  }

  const entries = queryWebTopupObservations({
    orderId: orderId || undefined,
    paymentIntentIdSuffix: paymentIntentIdSuffix || undefined,
    limit,
  });

  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(200).json({
    ok: true,
    schemaVersion: 1,
    domain: 'webtopup',
    orderId: orderId || null,
    paymentIntentIdSuffix: paymentIntentIdSuffix || null,
    count: entries.length,
    entries,
  });
});

export default router;
