import {
  normalizeRouteKey,
  recordHttpLatency,
} from '../lib/opsMetrics.js';

/**
 * Records response latency per normalized route bucket (in-process).
 */
export function httpLatencyMiddleware(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    try {
      const key = normalizeRouteKey(req.originalUrl || req.url || '');
      recordHttpLatency(key, Date.now() - start);
    } catch {
      /* ignore */
    }
  });
  next();
}
