/**
 * L7 money-path correlation spans (stdout JSON). No secrets/PII — values sanitized.
 * Grep: `"l7":true` + `zora.l7.money_path.v1`
 */

import { sanitizePhase1ObservabilityFields } from './phase1ObservabilitySanitize.js';

export const L7_MONEY_PATH_SCHEMA = 'zora.l7.money_path.v1';

/**
 * @param {{
 *   surface: 'checkout'|'webhook'|'ledger'|'fulfillment'|'fraud'|'security'|'api',
 *   stage: string,
 *   outcome: 'ok'|'error'|'noop'|'invalid'|'blocked',
 *   traceId?: string | null,
 *   refs?: Record<string, unknown>,
 * }} p
 */
export function emitL7MoneyPathSpan(p) {
  const refs =
    p.refs && typeof p.refs === 'object' && !Array.isArray(p.refs)
      ? sanitizePhase1ObservabilityFields({ ...p.refs })
      : {};
  const line = sanitizePhase1ObservabilityFields({
    l7: true,
    schema: L7_MONEY_PATH_SCHEMA,
    surface: p.surface,
    stage: p.stage,
    outcome: p.outcome,
    traceId:
      typeof p.traceId === 'string' && p.traceId.trim()
        ? p.traceId.trim().slice(0, 128)
        : null,
    t: new Date().toISOString(),
    refs,
  });
  console.log(JSON.stringify(line));
}
