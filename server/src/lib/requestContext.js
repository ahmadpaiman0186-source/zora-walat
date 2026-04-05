import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

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

/** @returns {string | undefined} */
export function getTraceId() {
  return storage.getStore()?.traceId;
}

export { storage as traceStorage };
