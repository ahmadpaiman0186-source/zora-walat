/**
 * Production-critical money-path alerts (structured JSON on stderr + metrics bump).
 * `extra` is sanitized; prefer suffixes in `extra` when extending.
 */

import { sanitizePhase1ObservabilityFields } from '../infrastructure/logging/phase1ObservabilitySanitize.js';
import { bumpMetric } from '../utils/metrics.js';

/**
 * @param {'critical' | 'warn'} severity
 * @param {string} code
 * @param {{ orderId?: string | null, traceId?: string | null, extra?: Record<string, unknown> }} ctx
 */
export function emitMoneyPathAlert(severity, code, ctx = {}) {
  bumpMetric(`money_path_alert_${severity}_${String(code).replace(/[^a-z0-9_]/gi, '_').slice(0, 64)}`, 1);
  const extraSafe =
    ctx.extra && typeof ctx.extra === 'object'
      ? sanitizePhase1ObservabilityFields(
          /** @type {Record<string, unknown>} */ (ctx.extra),
        )
      : {};
  const payload = {
    moneyPathAlert: true,
    severity,
    code,
    orderId: ctx.orderId ?? null,
    traceId: ctx.traceId ?? null,
    t: new Date().toISOString(),
    ...extraSafe,
  };
  if (severity === 'critical') {
    console.error(JSON.stringify(payload));
  } else {
    console.warn(JSON.stringify(payload));
  }
}
