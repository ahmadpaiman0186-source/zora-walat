import { getTraceId } from '../../lib/requestContext.js';
import { sanitizePhase1ObservabilityFields } from './phase1ObservabilitySanitize.js';

/**
 * One-line JSON for payment / webhook / fulfillment operations.
 * Grep: `moneyPath":true` or specific `MONEY_PATH_EVENT` values.
 * Never log secrets, raw card data, or full webhook bodies.
 *
 * @param {string} event — use `MONEY_PATH_EVENT` constants
 * @param {Record<string, unknown>} [fields]
 */
export function emitMoneyPathLog(event, fields = {}) {
  const traceId = fields.traceId ?? getTraceId() ?? undefined;
  const { traceId: _omit, ...rest } = fields;
  const safeRest = sanitizePhase1ObservabilityFields(rest);
  const line = sanitizePhase1ObservabilityFields({
    moneyPath: true,
    event,
    t: new Date().toISOString(),
    ...safeRest,
  });
  if (typeof traceId === 'string' && traceId.trim()) {
    line.traceId = traceId.trim().slice(0, 128);
  }
  console.log(JSON.stringify(line));
}
