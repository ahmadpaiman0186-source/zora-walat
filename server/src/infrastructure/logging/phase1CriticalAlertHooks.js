/**
 * Report-only critical alert foundation — JSON lines + optional in-process hooks for tests / future notifiers.
 * No HTTP calls, no mutation of money state.
 */

import { sanitizePhase1ObservabilityFields } from './phase1ObservabilitySanitize.js';

export const PHASE1_CRITICAL_ALERT_TYPE = Object.freeze({
  PAYMENT_SUCCEEDED_BUT_FULFILLMENT_FAILED: 'payment_succeeded_but_fulfillment_failed',
  DUPLICATE_FULFILLMENT_BLOCKED: 'duplicate_fulfillment_blocked',
  RECONCILIATION_DRIFT_DETECTED: 'reconciliation_drift_detected',
});

/** @type {Array<(type: string, payload: Record<string, unknown>) => void>} */
let hooks = [];

/**
 * Register a listener (tests or future PagerDuty adapter). Must not throw from handlers.
 *
 * @param {(type: string, payload: Record<string, unknown>) => void} fn
 */
export function registerPhase1CriticalAlertHook(fn) {
  if (typeof fn !== 'function') return;
  hooks.push(fn);
}

/** Test helper — clears registered hooks. */
export function resetPhase1CriticalAlertHooksForTests() {
  hooks = [];
}

/**
 * @param {string} alertType — use `PHASE1_CRITICAL_ALERT_TYPE`
 * @param {Record<string, unknown>} payload — sanitized before log/hooks
 */
export function reportPhase1CriticalAlert(alertType, payload = {}) {
  const safe = sanitizePhase1ObservabilityFields(payload);
  const line = {
    phase1CriticalAlert: true,
    schemaVersion: 1,
    alertType,
    t: new Date().toISOString(),
    ...safe,
  };
  console.log(JSON.stringify(line));
  for (const h of hooks) {
    try {
      h(alertType, safe);
    } catch {
      // ignore — observability must never break callers
    }
  }
}
