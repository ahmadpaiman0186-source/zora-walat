import {
  getCorsAllowDecision,
  originHostnameForLog,
} from '../lib/corsPolicy.js';

/**
 * Logs rejected browser origins (CORS still allows the request through; browser enforces).
 * Runs after pino-http so `req.log` exists.
 */
export function logCorsRejected(req, _res, next) {
  const origin = req.headers.origin;
  if (origin && !getCorsAllowDecision(origin).allowed) {
    req.log?.warn(
      {
        securityEvent: 'cors_origin_rejected',
        originHost: originHostnameForLog(origin),
      },
      'security',
    );
  }
  next();
}
