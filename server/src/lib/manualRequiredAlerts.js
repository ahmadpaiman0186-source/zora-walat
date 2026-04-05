import { getTraceId } from './requestContext.js';
import { safeSuffix } from './webTopupObservability.js';

/**
 * Structured ops alerts for stuck-processing manual queue (no PII, suffix ids only).
 * @param {object} p
 * @param {'manual_required_detected' | 'manual_required_aged' | 'manual_required_count_threshold_exceeded'} p.event
 * @param {'INFO' | 'WARN' | 'CRITICAL'} p.severity
 * @param {string | null | undefined} [p.traceId]
 * @param {string | null | undefined} [p.orderId]
 * @param {Record<string, unknown>} [p.extra]
 */
export function logManualRequiredAlert({
  event,
  severity,
  traceId,
  orderId,
  extra,
}) {
  const line = {
    manualRequiredAlert: true,
    event,
    severity,
    traceId: traceId ?? getTraceId() ?? null,
    orderIdSuffix: orderId ? safeSuffix(orderId, 10) : null,
    t: new Date().toISOString(),
    ...(extra && Object.keys(extra).length ? { extra } : {}),
  };
  const fn =
    severity === 'CRITICAL'
      ? console.error
      : severity === 'WARN'
        ? console.warn
        : console.log;
  fn(JSON.stringify(line));
}
