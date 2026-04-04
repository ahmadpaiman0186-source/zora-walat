import { randomUUID } from 'node:crypto';

/**
 * Pre-launch mode: log only requestId, route, status, duration (no headers/body).
 */
export function attachMinimalRequestLogger(logger) {
  return function minimalRequestLogger(req, res, next) {
    const id = randomUUID();
    req.id = id;
    req.log = logger.child({ requestId: id });
    const start = Date.now();
    res.on('finish', () => {
      req.log.info({
        route: req.originalUrl || req.url,
        status: res.statusCode,
        ms: Date.now() - start,
      });
    });
    next();
  };
}
