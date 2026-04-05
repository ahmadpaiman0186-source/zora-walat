/**
 * Structured observability for WebTopupOrder + Stripe Payment Element lifecycle.
 * Logs use `event` as the canonical name; never include secrets or raw tokens.
 */

/** @type {Record<string, number>} */
const metrics = {};

const TRACKED_EVENTS = new Set([
  'order_created',
  'order_create_replayed',
  'order_create_failed',
  'payment_intent_created',
  'payment_intent_failed',
  'payment_succeeded',
  'payment_failed',
  'order_mark_paid_requested',
  'order_mark_paid_completed',
  'order_mark_paid_replayed',
  'webhook_received',
  'webhook_verified',
  'webhook_processed',
  'webhook_duplicate_ignored',
  'webhook_failed',
  'suspicious_request_detected',
  'reconciliation_checked',
  'reconciliation_mismatch_detected',
  'fulfillment_dispatch_requested',
  'fulfillment_dispatch_rejected',
  'fulfillment_queued',
  'fulfillment_processing',
  'fulfillment_provider_called',
  'fulfillment_succeeded',
  'fulfillment_failed_retryable',
  'fulfillment_failed_terminal',
  'fulfillment_retry_requested',
  'fulfillment_retry_completed',
  'fulfillment_provider_unsupported',
  'fulfillment_diagnostics_checked',
  'provider_config_validated',
  'provider_scope_validated',
  'operator_mapping_validated',
  'operator_mapping_missing',
  'sandbox_dispatch_verified',
  'sandbox_dispatch_failed',
  'retry_eligibility_checked',
]);

/**
 * @param {string | null | undefined} id
 * @param {number} [len]
 */
export function safeSuffix(id, len = 8) {
  if (id == null || typeof id !== 'string') return undefined;
  const s = id.trim();
  if (!s) return undefined;
  return s.length <= len ? s : s.slice(-len);
}

/**
 * Session key is client-visible (UUID); log only a short suffix for correlation.
 * @param {string | null | undefined} sessionKey
 */
export function sessionKeySuffix(sessionKey) {
  return safeSuffix(sessionKey, 4);
}

/**
 * @param {string} event
 */
export function bumpWebTopupMetric(event) {
  const k = TRACKED_EVENTS.has(event) ? event : `_other_${event}`;
  metrics[k] = (metrics[k] ?? 0) + 1;
}

/** Snapshot for readiness / ops (in-process counters). */
export function getWebTopupMetricsSnapshot() {
  return { ...metrics, collectedAt: new Date().toISOString() };
}

/**
 * @param {import('pino').Logger | undefined} log
 * @param {string} level
 * @param {string} event
 * @param {Record<string, unknown>} [fields]
 */
export function webTopupLog(log, level, event, fields = {}) {
  bumpWebTopupMetric(event);
  const payload = {
    event,
    ts: new Date().toISOString(),
    ...fields,
  };
  const l = log?.[level] ?? log?.info;
  if (typeof l === 'function') {
    l.call(log, payload, 'web_topup');
  }
}
