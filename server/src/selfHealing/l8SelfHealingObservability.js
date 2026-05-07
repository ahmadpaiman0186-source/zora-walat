/**
 * L8 self-healing spans — stdout JSON via shared L7 pipeline (suffix-only checkout refs).
 */

import { emitL7MoneyPathSpan } from '../infrastructure/logging/l7MoneyPathObservability.js';

function suffix(id, n = 12) {
  const s = String(id ?? '');
  return s.length <= n ? s : s.slice(-n);
}

/**
 * @param {'self_healing_detected'|'self_healing_repair_applied'|'self_healing_skipped'} event
 * @param {{
 *   traceId?: string | null,
 *   type: string,
 *   subtype?: string | null,
 *   checkoutId: string,
 *   action?: string | null,
 *   result?: string | null,
 * }} p
 */
export function emitSelfHealingSpan(event, p) {
  emitL7MoneyPathSpan({
    surface: 'security',
    stage: event,
    outcome:
      event === 'self_healing_skipped'
        ? 'noop'
        : 'ok',
    traceId: p.traceId ?? null,
    refs: {
      selfHealingEvent: event,
      driftType: p.type,
      driftSubtype: p.subtype ?? null,
      checkoutIdSuffix: suffix(p.checkoutId, 12),
      action: p.action ?? null,
      result: p.result ?? null,
    },
  });
}
