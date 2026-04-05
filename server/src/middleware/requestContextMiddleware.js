import { randomUUID } from 'node:crypto';

/**
 * `req.traceId` for logs/metrics (from `X-Trace-Id` or generated).
 * AsyncLocalStorage is established inside workers (e.g. fulfillment) via `runWithTrace`, not here,
 * so Express async handlers are not accidentally dropped from context.
 */
export function requestContextMiddleware(req, res, next) {
  const incoming = req.headers['x-trace-id'];
  const traceId =
    typeof incoming === 'string' && incoming.trim().length > 0
      ? incoming.trim().slice(0, 128)
      : randomUUID();
  req.traceId = traceId;
  res.setHeader('X-Trace-Id', traceId);
  next();
}
