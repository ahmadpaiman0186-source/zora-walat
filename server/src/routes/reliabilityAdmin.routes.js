import { Router } from 'express';

import { INTERNAL_TOOLING_CODE } from '../constants/apiContractCodes.js';
import { clientErrorBody } from '../lib/clientErrorJson.js';
import { requireAuth, requireStaff } from '../middleware/authMiddleware.js';
import { staffPrivilegedLimiter } from '../middleware/rateLimits.js';
import { redactForReliabilityReport } from '../reliability/reliabilityHealthRedact.js';
import { buildSelfHealingReport } from '../reliability/selfHealingOrchestrator.js';

const router = Router();

/**
 * L7 reliability health — staff only; no secrets/PII in payload.
 * GET /api/admin/reliability/health
 */
router.get(
  '/reliability/health',
  requireAuth,
  requireStaff,
  staffPrivilegedLimiter,
  async (req, res) => {
    try {
      const traceId = req.traceId ?? null;
      const runRecovery = String(req.query.runRecovery ?? '') === '1';
      const report = await buildSelfHealingReport({
        traceId,
        runRecovery,
        recoveryStaleMs: 600_000,
      });
      const body = redactForReliabilityReport({
        ok: report.ok,
        severity: report.severity,
        moneyPathReady: report.moneyPathReady,
        providerReady: report.providerReady,
        dbReady: report.dbReady,
        redisReady: report.redisReady,
        queueReady: report.queueReady,
        recentFailures: report.recentFailures,
        recoveryActions: report.recoveryActions,
        failClosedRecommendation: report.failClosedRecommendation,
        staleProcessingCount: report.staleProcessingCount,
        paidIdleRoughCount: report.paidIdleRoughCount,
        recoveryRun: {
          attempted: report.recoveryRun?.attempted ?? 0,
          ok: report.recoveryRun?.ok ?? true,
          results: (report.recoveryRun?.results ?? []).map((r) => ({
            orderIdSuffix: String(r.orderId ?? '').slice(-12),
            attemptIdSuffix: r.attemptIdSuffix,
            outcome: r.outcome,
          })),
        },
      });
      res.setHeader('Cache-Control', 'no-store');
      res.json(body);
    } catch (e) {
      req.log?.error({ err: e }, 'reliability_health_failed');
      res
        .status(500)
        .json(
          clientErrorBody('Internal error', INTERNAL_TOOLING_CODE.OPS_INTERNAL_ERROR),
        );
    }
  },
);

export default router;
