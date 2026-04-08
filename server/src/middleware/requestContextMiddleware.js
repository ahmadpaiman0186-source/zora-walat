import { randomUUID } from 'node:crypto';

import { correlationStorage } from '../lib/correlationContext.js';

/**
 * `req.traceId` / `req.requestId` for logs + distributed trace continuity (`X-Trace-Id`, `X-Request-Id`).
 * AsyncLocalStorage context for HTTP handlers (propagates across awaited work in Node 20+).
 */
export function requestContextMiddleware(req, res, next) {
  const incomingTrace = req.headers['x-trace-id'];
  const traceId =
    typeof incomingTrace === 'string' && incomingTrace.trim().length > 0
      ? incomingTrace.trim().slice(0, 128)
      : randomUUID();
  const incomingReq = req.headers['x-request-id'];
  const requestId =
    typeof incomingReq === 'string' && incomingReq.trim().length > 0
      ? incomingReq.trim().slice(0, 128)
      : randomUUID();

  const store = {
    traceId,
    requestId,
    orderId: null,
    attemptId: null,
    surface: 'api',
  };

  correlationStorage.run(store, () => {
    req.traceId = traceId;
    req.requestId = requestId;
    /** @type {import('../lib/correlationContext.js').CorrelationStore} */
    req.correlation = store;
    res.setHeader('X-Trace-Id', traceId);
    res.setHeader('X-Request-Id', requestId);
    next();
  });
}
