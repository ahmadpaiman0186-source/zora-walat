import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

import { getCorrelation } from './correlationContext.js';

/** @typedef {{ traceId: string }} TraceStore */

const storage = new AsyncLocalStorage();

/**
 * @param {string | null | undefined} traceId
 * @param {() => void | Promise<void>} fn
 * @returns {ReturnType<typeof fn>}
 */
export function runWithTrace(traceId, fn) {
  const id =
    traceId && String(traceId).trim()
      ? String(traceId).trim()
      : randomUUID();
  return /** @type {ReturnType<typeof fn>} */ (
    storage.run({ traceId: id }, fn)
  );
}

/**
 * Worker/async paths use `runWithTrace`. HTTP uses `correlationStorage` only (`requestContextMiddleware`).
 * Bridge so ledger + money-path logs resolve the same trace id without duplicating ALS writes.
 * @returns {string | undefined}
 */
export function getTraceId() {
  const fromWorker = storage.getStore()?.traceId;
  if (fromWorker) return fromWorker;
  const c = getCorrelation()?.traceId;
  return typeof c === 'string' && c.trim() ? c.trim() : undefined;
}

export { storage as traceStorage };
