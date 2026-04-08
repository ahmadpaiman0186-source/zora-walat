/**
 * Request / job correlation for logs and future OpenTelemetry (traceId, requestId, orderId, attemptId).
 * Uses AsyncLocalStorage — see Node docs; async Express handlers generally preserve context in Node 20+.
 */
import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * @typedef {object} CorrelationStore
 * @property {string} traceId
 * @property {string} requestId
 * @property {string | null} [orderId]
 * @property {string | null} [attemptId]
 * @property {string} [surface] api | worker | webhook | script
 */

/** @type {AsyncLocalStorage<CorrelationStore>} */
const correlationStorage = new AsyncLocalStorage();

/**
 * @param {CorrelationStore} store
 * @param {() => void | Promise<void>} fn
 */
export function runWithCorrelation(store, fn) {
  return /** @type {ReturnType<typeof fn>} */ (correlationStorage.run(store, fn));
}

/** @returns {CorrelationStore | undefined} */
export function getCorrelation() {
  return correlationStorage.getStore();
}

/**
 * @returns {Record<string, string | null>}
 */
export function getCorrelationLogFields() {
  const c = getCorrelation();
  if (!c) {
    return {};
  }
  return {
    traceId: c.traceId,
    requestId: c.requestId,
    orderId: c.orderId ?? null,
    attemptId: c.attemptId ?? null,
    surface: c.surface ?? null,
  };
}

/**
 * @param {{ orderId?: string | null, attemptId?: string | null }} p
 */
export function mergeOrderAttemptIntoCorrelation(p) {
  const c = correlationStorage.getStore();
  if (!c) return;
  if (p.orderId != null && String(p.orderId).trim()) c.orderId = String(p.orderId).trim();
  if (p.attemptId != null && String(p.attemptId).trim()) c.attemptId = String(p.attemptId).trim();
}

export { correlationStorage };
