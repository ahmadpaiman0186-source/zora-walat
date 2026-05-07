import { Router } from 'express';

import { opsInfraHealthTokenMatches } from '../middleware/opsInfraHealthGate.js';
import { getPhase1MissionMetricsSnapshot } from '../infrastructure/observability/phase1MissionObservability.js';
import { getOpsMetricsSnapshot } from '../lib/opsMetrics.js';

const router = Router();

/**
 * Token-gated JSON metrics (in-process + legacy ops counters). No secrets.
 * GET /internal/metrics
 */
router.get('/metrics', (req, res) => {
  if (!opsInfraHealthTokenMatches(req)) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(401).json({
      ok: false,
      error: 'unauthorized',
      hint: 'Set Authorization: Bearer <OPS_HEALTH_TOKEN> or X-ZW-Ops-Token',
    });
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    ok: true,
    phase1Mission: getPhase1MissionMetricsSnapshot(),
    opsLegacy: getOpsMetricsSnapshot(),
  });
});

export default router;
