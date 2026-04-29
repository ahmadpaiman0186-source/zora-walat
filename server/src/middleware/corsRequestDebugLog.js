import { getCorsAllowDecision } from '../lib/corsPolicy.js';

/**
 * Per-request CORS decision log (pino `debug` by default; `info` when CORS_DEBUG_LOG=true).
 * Mount **after** `pino-http` so `req.log` exists.
 */
export function corsRequestDebugLog(req, res, next) {
  const origin = req.headers.origin;
  const d = getCorsAllowDecision(origin);
  const payload = {
    origin: origin ?? null,
    method: req.method,
    path: req.originalUrl || req.url,
    allowed: d.allowed,
    reason: d.reason,
    CORS_ALLOW: d.CORS_ALLOW,
  };
  if (String(process.env.CORS_DEBUG_LOG ?? '').trim() === 'true') {
    req.log?.info({ cors: payload }, 'cors_request');
  } else {
    req.log?.debug({ cors: payload }, 'cors_request');
  }
  next();
}
