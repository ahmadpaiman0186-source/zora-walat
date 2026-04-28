/**
 * Structured observability for WebTopupOrder + Stripe Payment Element lifecycle.
 * Logs use `event` as the canonical name; never include secrets or raw tokens.
 */

import { appendWebtopDurableLogLine } from './webtopDurableLogSink.js';

/** @type {Record<string, number>} */
const metrics = {};

const TRACKED_EVENTS = new Set([
  'order_created',
  'order_create_replayed',
  'order_create_failed',
  'payment_intent_created',
  'payment_intent_failed',
  'payment_succeeded',
  'payment_received',
  'payment_failed',
  'order_mark_paid_requested',
  'order_mark_paid_completed',
  'order_mark_paid_replayed',
  'webhook_received',
  'webhook_verified',
  'webhook_processed',
  'webhook_processing_started',
  'webhook_processing_completed',
  'webhook_processing_failed',
  'webhook_duplicate_ignored',
  'webhook_failed',
  'fallback_payment_detected',
  'fallback_payment_applied',
  'fallback_poller_skipped',
  'fallback_poller_order_error',
  'suspicious_request_detected',
  'rate_limit_exceeded',
  'reconciliation_checked',
  'reconciliation_scan_started',
  'reconciliation_scan_completed',
  'reconciliation_mismatch_detected',
  'fulfillment_dispatch_requested',
  'fulfillment_dispatch_rejected',
  'fulfillment_queued',
  'fulfillment_processing',
  'fulfillment_started',
  'fulfillment_provider_called',
  'fulfillment_succeeded',
  'fulfillment_failed',
  'fulfillment_failed_retryable',
  'fulfillment_failed_terminal',
  'fulfillment_persist_failed',
  'fulfillment_retry_requested',
  'fulfillment_retry_scheduled',
  'fulfillment_retry_attempt',
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
  'webtop_admin_retry',
  'webtop_admin_force_deliver',
  'webtop_admin_status',
  'webtop_admin_reconciliation',
  'webtop_admin_reconciliation_recent',
  'webtop_admin_provider_health',
  'webtop_admin_monitoring',
  'provider_circuit_opened',
  'provider_circuit_half_open',
  'provider_circuit_closed',
  'provider_call_blocked_by_circuit',
  'financial_guardrail_blocked',
  'fulfillment_job_claimed',
  'fulfillment_job_processing_started',
  'fulfillment_job_processing_completed',
  'fulfillment_job_stale_detected',
  'fulfillment_job_recovered',
  'fulfillment_job_deferred',
  'webtop_admin_queue_health',
  'webtop_admin_rate_limited',
  'webtop_admin_ip_blocked',
  'abuse_blocked',
  'abuse_signal_detected',
  'sla_violation_detected',
  'sla_warning_detected',
  'sla_enforcement_triggered',
  'sla_auto_retry_triggered',
  'sla_auto_failure_triggered',
  'sla_enforcement_dispatch_failed',
  'sla_enforcement_skipped_recent_job',
  'config_validation_failed',
  'config_validation_warning',
  'incident_detected',
  'incident_action_suggested',
  'incident_action_executed',
  'incident_action_failed',
]);

/** In-process ring buffer for ops viewer (not durable; single-process). */
const WEBTOPUP_OBS_BUFFER_MAX = 5000;
/** @type {Record<string, unknown>[]} */
const webTopupObservationBuffer = [];

/**
 * @param {unknown} v
 * @returns {boolean}
 */
function isPlainObject(v) {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Strip high-risk keys and truncate long strings (JSON-safe for viewer).
 * @param {unknown} input
 * @param {number} depth
 * @returns {unknown}
 */
export function sanitizeWebTopupObservationFields(input, depth = 0) {
  if (depth > 6) return '[max_depth]';
  if (input == null) return input;
  if (typeof input === 'string') {
    return input.length > 500 ? `${input.slice(0, 500)}…` : input;
  }
  if (typeof input === 'number' || typeof input === 'boolean') return input;
  if (Array.isArray(input)) {
    return input.slice(0, 50).map((x) => sanitizeWebTopupObservationFields(x, depth + 1));
  }
  if (typeof input !== 'object') {
    return String(input).slice(0, 200);
  }
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [k, v] of Object.entries(input)) {
    const kl = k.toLowerCase();
    if (
      kl.includes('secret') ||
      kl.includes('password') ||
      kl.includes('token') ||
      kl === 'authorization' ||
      kl.includes('cookie') ||
      kl.includes('card') ||
      kl === 'rawbody'
    ) {
      continue;
    }
    out[k] = sanitizeWebTopupObservationFields(v, depth + 1);
  }
  return out;
}

/**
 * @param {Record<string, unknown>} payload
 */
function pushWebTopupObservation(payload) {
  const safe = /** @type {Record<string, unknown>} */ (
    sanitizeWebTopupObservationFields(payload)
  );
  webTopupObservationBuffer.push(safe);
  if (webTopupObservationBuffer.length > WEBTOPUP_OBS_BUFFER_MAX) {
    webTopupObservationBuffer.shift();
  }
  return safe;
}

/**
 * Recent structured webtop observations (newest last in returned array).
 * @param {{ orderId?: string; paymentIntentIdSuffix?: string; limit?: number }} q
 * @returns {Record<string, unknown>[]}
 */
export function queryWebTopupObservations(q) {
  const orderId = String(q.orderId ?? '').trim();
  const piSuf = String(q.paymentIntentIdSuffix ?? '').trim();
  const limit = Math.min(500, Math.max(1, q.limit ?? 100));
  let list = webTopupObservationBuffer;
  if (orderId) {
    list = list.filter((e) => {
      if (!isPlainObject(e)) return false;
      return String(e.orderId ?? '') === orderId;
    });
  }
  if (piSuf) {
    list = list.filter((e) => {
      if (!isPlainObject(e)) return false;
      const p = String(e.paymentIntentIdSuffix ?? '');
      return p === piSuf || p.endsWith(piSuf) || piSuf.endsWith(p);
    });
  }
  return list.slice(-limit);
}

/**
 * Correlation fields for money-path JSON logs (no PANs, no webhook secrets).
 * @param {string} orderId
 * @param {string | null | undefined} paymentIntentId
 * @param {string | null | undefined} traceId
 */
export function webTopupCorrelationFields(orderId, paymentIntentId, traceId) {
  return {
    traceId: traceId ?? undefined,
    orderId,
    orderIdSuffix: safeSuffix(orderId, 8),
    paymentIntentIdSuffix: safeSuffix(paymentIntentId, 10),
  };
}

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
    schemaVersion: 1,
    domain: 'webtopup',
    ...fields,
  };
  const safe = pushWebTopupObservation(payload);
  void appendWebtopDurableLogLine(safe);
  const l = log?.[level] ?? log?.info;
  if (typeof l === 'function') {
    l.call(log, payload, 'web_topup');
  }
}
