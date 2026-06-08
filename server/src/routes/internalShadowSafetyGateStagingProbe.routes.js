import { Router } from 'express';

import { opsInfraHealthTokenMatches } from '../middleware/opsInfraHealthGate.js';
import {
  emitStagingProbeShadowDiagnostic,
  isStagingProbeRouteAllowed,
  readStagingProbeEnvConfig,
} from '../reliability/shadowSafetyGate/stagingProbeDiagnostics.js';

const router = Router();

function respondNotFound(res) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(404).json({ ok: false, error: 'not_found' });
}

/**
 * @param {import('express').Request} req
 */
function hasDisallowedRequestBody(req) {
  if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
    return Object.keys(req.body).length > 0;
  }
  if (typeof req.body === 'string' && req.body.trim().length > 0) {
    return true;
  }
  const len = parseInt(String(req.headers['content-length'] ?? '0'), 10);
  if (Number.isFinite(len) && len > 0) {
    if (!req.body || (typeof req.body === 'object' && Object.keys(req.body).length === 0)) {
      return true;
    }
  }
  return false;
}

/**
 * POST /internal/staging/shadow-safety-gate/diagnostic-probe
 * Staging-only, token-gated, non-mutating shadow diagnostics probe.
 */
router.post('/staging/shadow-safety-gate/diagnostic-probe', (req, res) => {
  const probeEnv = readStagingProbeEnvConfig();
  if (!isStagingProbeRouteAllowed(probeEnv)) {
    return respondNotFound(res);
  }

  if (!opsInfraHealthTokenMatches(req)) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(401).json({
      ok: false,
      error: 'unauthorized',
      hint: 'Set Authorization: Bearer <OPS_HEALTH_TOKEN> or X-ZW-Ops-Token',
    });
  }

  if (hasDisallowedRequestBody(req)) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(400).json({ ok: false, error: 'body_not_allowed' });
  }

  const result = emitStagingProbeShadowDiagnostic({
    log: req.log,
    envConfig: probeEnv,
  });

  if (!result.emitted) {
    return respondNotFound(res);
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    ok: true,
    emitted: true,
    probeId: result.probeId,
    correlationFingerprint: result.correlationFingerprint,
  });
});

export default router;
