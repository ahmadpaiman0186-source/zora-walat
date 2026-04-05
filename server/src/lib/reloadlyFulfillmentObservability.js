import { safeSuffix } from './webTopupObservability.js';

/**
 * Structured Reloadly airtime fulfillment events (no secrets, tokens, or PII).
 * @param {import('pino').Logger | undefined} log
 * @param {'info'|'warn'|'error'} level
 * @param {string} event — dotted event name (e.g. reloadly_request_started)
 * @param {Record<string, unknown>} payload
 */
export function emitReloadlyFulfillmentEvent(log, level, event, payload) {
  const line = {
    reloadlyFulfillmentLog: true,
    event,
    ...payload,
  };
  const fn = log?.[level];
  if (typeof fn === 'function') {
    fn.call(log, line);
    return;
  }
  const c = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  c(JSON.stringify(line));
}

/**
 * @param {string | null | undefined} orderId
 * @param {{ traceId?: string | null, attemptNumber?: number | null, providerReference?: string | null, latencyMs?: number, normalizedOutcome?: string, decisionPath?: string, proofClassification?: string }} fields
 */
export function reloadlyFulfillmentBaseFields(orderId, fields) {
  return {
    traceId: fields.traceId ?? null,
    orderIdSuffix: orderId ? safeSuffix(orderId, 12) : null,
    attemptNumber: fields.attemptNumber ?? null,
    providerReferenceSuffix: fields.providerReference
      ? safeSuffix(fields.providerReference, 12)
      : null,
    latencyMs: fields.latencyMs ?? null,
    normalizedOutcome: fields.normalizedOutcome ?? null,
    decisionPath: fields.decisionPath ?? null,
    proofClassification: fields.proofClassification ?? null,
  };
}
