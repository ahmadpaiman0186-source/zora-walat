import { getTraceId } from '../lib/requestContext.js';
import { safeSuffix } from '../lib/webTopupObservability.js';

/**
 * Structured delivery pipeline logs (no secrets, no card data).
 * @param {object} p
 * @param {string} p.orderId
 * @param {string} p.phase — e.g. orchestration_skip | provider_invoke | provider_result
 * @param {string} p.result — ok | noop | failure | pending
 * @param {string | null} [p.failureReason]
 * @param {string | null} [p.detail]
 */
export function logDeliveryEvent(p) {
  const line = {
    deliveryLog: true,
    traceId: getTraceId() ?? null,
    orderIdSuffix: safeSuffix(p.orderId, 12),
    phase: p.phase,
    result: p.result,
    failureReason: p.failureReason ?? null,
    detail: p.detail ?? null,
  };
  console.log(JSON.stringify(line));
}
