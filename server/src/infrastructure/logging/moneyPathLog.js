import { getTraceId } from '../../lib/requestContext.js';

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
  const line = {
    moneyPath: true,
    event,
    t: new Date().toISOString(),
    ...rest,
  };
  if (traceId) line.traceId = traceId;
  console.log(JSON.stringify(line));
}
