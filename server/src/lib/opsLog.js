import { getTraceId } from './requestContext.js';
import { safeSuffix } from './webTopupObservability.js';

/** @typedef {'payment' | 'fulfillment' | 'push' | 'http' | 'stripe_webhook'} OpsDomain */

/**
 * Structured operations log line — no PII, short order correlation only.
 * @param {object} p
 * @param {OpsDomain} p.domain
 * @param {string} p.event
 * @param {string} p.outcome
 * @param {string | null} [p.orderId]
 * @param {string | null} [p.traceId]
 * @param {Record<string, unknown>} [p.extra]
 */
export function logOpsEvent(p) {
  const traceId = p.traceId ?? getTraceId();
  const line = {
    opsLog: true,
    domain: p.domain,
    event: p.event,
    outcome: p.outcome,
    traceId: traceId ?? null,
    orderIdSuffix: p.orderId ? safeSuffix(p.orderId, 10) : null,
    t: new Date().toISOString(),
    ...(p.extra && Object.keys(p.extra).length ? { extra: p.extra } : {}),
  };
  console.log(JSON.stringify(line));
}
