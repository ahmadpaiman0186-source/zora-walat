/**
 * Phase 1 mission observability: structured JSON lines + in-process counters/timers + local ALERT simulation.
 * No external metrics SaaS; no secrets in exported snapshots.
 */

import { redactAuditPayloadSecrets } from '../../services/orderAuditService.js';
import { getOpsAlertWindows } from '../../lib/opsMetrics.js';

export const PHASE1_MISSION_LOG_SCHEMA = 'zora.phase1.observability.v1';

/** @type {Record<string, number>} */
const counters = {
  payments_created: 0,
  payments_paid: 0,
  webhooks_received: 0,
  webhooks_invalid_sig: 0,
  fulfillment_started: 0,
  fulfillment_succeeded: 0,
  fulfillment_failed: 0,
  reconciliation_findings_total: 0,
};

/** @type {{ t: number, ok: boolean }[]} */
const windowWebhookSig = [];

/** @type {number[]} */
const checkoutToPaidSamples = [];
/** @type {number[]} */
const paidToFulfillmentSamples = [];

const MAX_LATENCY_SAMPLES = 200;
const WEBHOOK_SIG_WINDOW_MAX = 80;

/** @type {Map<string, number>} */
const checkoutCreatedAtMs = new Map();
/** @type {Map<string, number>} */
const paidAtMsByCheckout = new Map();

function capMap(m, max = 800) {
  if (m.size <= max) return;
  const iter = m.keys();
  while (m.size > max) {
    const k = iter.next();
    if (k.done) break;
    m.delete(k.value);
  }
}

function pushBounded(arr, n) {
  arr.push(n);
  while (arr.length > MAX_LATENCY_SAMPLES) arr.shift();
}

function pruneWebhookWindow() {
  const now = Date.now();
  const WINDOW_MS = 15 * 60 * 1000;
  while (windowWebhookSig.length && now - windowWebhookSig[0].t > WINDOW_MS) {
    windowWebhookSig.shift();
  }
  while (windowWebhookSig.length > WEBHOOK_SIG_WINDOW_MAX) windowWebhookSig.shift();
}

function bump(name, delta = 1) {
  if (!(name in counters)) counters[name] = 0;
  counters[name] += delta;
}

function percentile95(samples) {
  if (!samples.length) return null;
  const s = [...samples].sort((a, b) => a - b);
  const idx = Math.ceil(0.95 * s.length) - 1;
  return s[Math.max(0, idx)];
}

/**
 * Structured JSON line (stdout). Payload shallow-redacted; never log raw bodies.
 *
 * @param {object} p
 * @param {'checkout'|'webhook'|'payment'|'fulfillment'|'reconciliation'|'recovery'} p.subsystem
 * @param {string} p.stage
 * @param {'ok'|'error'|'noop'|'invalid'} p.outcome
 * @param {string | null} [p.traceId]
 * @param {string | null} [p.orderId]
 * @param {string | null} [p.checkoutId]
 * @param {string | null} [p.eventIdSuffix]
 * @param {number | null} [p.latencyMs]
 * @param {Record<string, unknown>} [p.extra]
 */
export function emitPhase1MissionStructuredLog(p) {
  const extra = p.extra && typeof p.extra === 'object' ? redactAuditPayloadSecrets({ ...p.extra }) : {};
  const line = redactAuditPayloadSecrets({
    schema: PHASE1_MISSION_LOG_SCHEMA,
    subsystem: p.subsystem,
    stage: p.stage,
    outcome: p.outcome,
    traceId: p.traceId ?? null,
    orderId: p.orderId ?? null,
    checkoutId: p.checkoutId ?? null,
    eventIdSuffix: p.eventIdSuffix ?? null,
    latencyMs:
      p.latencyMs != null && Number.isFinite(Number(p.latencyMs))
        ? Math.round(Number(p.latencyMs))
        : null,
    t: new Date().toISOString(),
    ...extra,
  });
  console.log(JSON.stringify(line));
}

export function recordMissionPaymentCreated(checkoutId, traceId) {
  bump('payments_created');
  if (checkoutId) {
    checkoutCreatedAtMs.set(String(checkoutId), Date.now());
    capMap(checkoutCreatedAtMs);
  }
  emitPhase1MissionStructuredLog({
    subsystem: 'checkout',
    stage: 'checkout_session_created',
    outcome: 'ok',
    traceId: traceId ?? null,
    orderId: checkoutId ?? null,
    checkoutId: checkoutId ?? null,
    eventIdSuffix: null,
    latencyMs: null,
  });
}

export function recordMissionWebhookReceived(traceId, eventIdSuffix) {
  bump('webhooks_received');
  windowWebhookSig.push({ t: Date.now(), ok: true });
  pruneWebhookWindow();
  emitPhase1MissionStructuredLog({
    subsystem: 'webhook',
    stage: 'stripe_signature_verified',
    outcome: 'ok',
    traceId: traceId ?? null,
    orderId: null,
    checkoutId: null,
    eventIdSuffix: eventIdSuffix ?? null,
    latencyMs: null,
  });
}

export function recordMissionWebhookInvalidSig(traceId) {
  bump('webhooks_invalid_sig');
  windowWebhookSig.push({ t: Date.now(), ok: false });
  pruneWebhookWindow();
  emitPhase1MissionStructuredLog({
    subsystem: 'webhook',
    stage: 'stripe_signature_verify',
    outcome: 'invalid',
    traceId: traceId ?? null,
    orderId: null,
    checkoutId: null,
    eventIdSuffix: null,
    latencyMs: null,
  });
  evaluatePhase1MissionAlerts();
}

export function recordMissionPaymentPaid(checkoutId, traceId, eventIdSuffix) {
  bump('payments_paid');
  const id = checkoutId != null ? String(checkoutId) : '';
  const started = id ? checkoutCreatedAtMs.get(id) : null;
  let latencyMs = null;
  if (started != null && Number.isFinite(started)) {
    latencyMs = Date.now() - started;
    pushBounded(checkoutToPaidSamples, latencyMs);
    checkoutCreatedAtMs.delete(id);
  }
  const now = Date.now();
  if (id) {
    paidAtMsByCheckout.set(id, now);
    capMap(paidAtMsByCheckout);
  }
  emitPhase1MissionStructuredLog({
    subsystem: 'payment',
    stage: 'payment_checkout_paid',
    outcome: 'ok',
    traceId: traceId ?? null,
    orderId: id || null,
    checkoutId: id || null,
    eventIdSuffix: eventIdSuffix ?? null,
    latencyMs,
  });
}

export function recordMissionFulfillmentStarted(checkoutId, traceId) {
  bump('fulfillment_started');
  const id = checkoutId != null ? String(checkoutId) : '';
  emitPhase1MissionStructuredLog({
    subsystem: 'fulfillment',
    stage: 'fulfillment_attempt_claimed',
    outcome: 'ok',
    traceId: traceId ?? null,
    orderId: id || null,
    checkoutId: id || null,
    eventIdSuffix: null,
    latencyMs: null,
  });
}

export function recordMissionFulfillmentSucceeded(checkoutId, traceId) {
  bump('fulfillment_succeeded');
  const id = checkoutId != null ? String(checkoutId) : '';
  const paidAt = id ? paidAtMsByCheckout.get(id) : null;
  let latencyMs = null;
  if (paidAt != null && Number.isFinite(paidAt)) {
    latencyMs = Date.now() - paidAt;
    pushBounded(paidToFulfillmentSamples, latencyMs);
    paidAtMsByCheckout.delete(id);
  }
  emitPhase1MissionStructuredLog({
    subsystem: 'fulfillment',
    stage: 'fulfillment_terminal',
    outcome: 'ok',
    traceId: traceId ?? null,
    orderId: id || null,
    checkoutId: id || null,
    eventIdSuffix: null,
    latencyMs,
  });
  evaluatePhase1MissionAlerts();
}

export function recordMissionFulfillmentFailed(checkoutId, traceId) {
  bump('fulfillment_failed');
  const id = checkoutId != null ? String(checkoutId) : '';
  const paidAt = id ? paidAtMsByCheckout.get(id) : null;
  let latencyMs = null;
  if (paidAt != null && Number.isFinite(paidAt)) {
    latencyMs = Date.now() - paidAt;
    pushBounded(paidToFulfillmentSamples, latencyMs);
    paidAtMsByCheckout.delete(id);
  }
  emitPhase1MissionStructuredLog({
    subsystem: 'fulfillment',
    stage: 'fulfillment_terminal',
    outcome: 'error',
    traceId: traceId ?? null,
    orderId: id || null,
    checkoutId: id || null,
    eventIdSuffix: null,
    latencyMs,
  });
  evaluatePhase1MissionAlerts();
}

export function recordMissionReconciliationScan(summary, traceId) {
  const n = summary?.count ?? 0;
  if (typeof n === 'number' && Number.isFinite(n) && n > 0) {
    bump('reconciliation_findings_total', n);
  }
  emitPhase1MissionStructuredLog({
    subsystem: 'reconciliation',
    stage: 'phase1_money_fulfillment_scan',
    outcome: 'ok',
    traceId: traceId ?? null,
    orderId: null,
    checkoutId: null,
    eventIdSuffix: null,
    latencyMs: null,
    extra: {
      findingCount: n,
      byActionV2: summary?.byActionV2 ?? undefined,
    },
  });
}

/** Thresholds for local ALERT lines (no paging). */
export const PHASE1_MISSION_ALERT_THRESHOLDS = {
  /** Invalid Stripe webhook sig rate over rolling window (min samples). */
  webhookInvalidSigRate: 0.01,
  webhookInvalidSigMinSamples: 24,
  /** Fulfillment terminal failure rate (reuses ops rolling fulfillment window). */
  fulfillmentFailedRate: 0.1,
  fulfillmentFailedMinSamples: 10,
  /** checkout → paid p95 latency (ms). */
  checkoutToPaidP95Ms: 600_000,
  checkoutToPaidMinSamples: 8,
};

function webhookInvalidSigRate() {
  pruneWebhookWindow();
  if (windowWebhookSig.length < PHASE1_MISSION_ALERT_THRESHOLDS.webhookInvalidSigMinSamples) {
    return null;
  }
  const bad = windowWebhookSig.filter((x) => !x.ok).length;
  return bad / windowWebhookSig.length;
}

function emitAlert(ruleId, detail) {
  console.log(
    JSON.stringify({
      ALERT: true,
      schema: PHASE1_MISSION_LOG_SCHEMA,
      ruleId,
      t: new Date().toISOString(),
      ...redactAuditPayloadSecrets(detail),
    }),
  );
}

export function evaluatePhase1MissionAlerts() {
  const whRate = webhookInvalidSigRate();
  if (
    whRate != null &&
    whRate > PHASE1_MISSION_ALERT_THRESHOLDS.webhookInvalidSigRate
  ) {
    emitAlert('webhook_invalid_sig_rate', {
      rate: whRate,
      windowSamples: windowWebhookSig.length,
      threshold: PHASE1_MISSION_ALERT_THRESHOLDS.webhookInvalidSigRate,
    });
  }

  const { fulfillment: fulfillmentWindow } = getOpsAlertWindows();
  const fRate =
    fulfillmentWindow.length >= PHASE1_MISSION_ALERT_THRESHOLDS.fulfillmentFailedMinSamples
      ? fulfillmentWindow.filter((x) => !x.ok).length / fulfillmentWindow.length
      : null;
  if (
    fRate != null &&
    fRate > PHASE1_MISSION_ALERT_THRESHOLDS.fulfillmentFailedRate
  ) {
    emitAlert('fulfillment_failed_rate', {
      rate: fRate,
      windowSamples: fulfillmentWindow.length,
      threshold: PHASE1_MISSION_ALERT_THRESHOLDS.fulfillmentFailedRate,
    });
  }

  const p95 = percentile95(checkoutToPaidSamples);
  if (
    checkoutToPaidSamples.length >= PHASE1_MISSION_ALERT_THRESHOLDS.checkoutToPaidMinSamples &&
    p95 != null &&
    p95 > PHASE1_MISSION_ALERT_THRESHOLDS.checkoutToPaidP95Ms
  ) {
    emitAlert('checkout_to_paid_p95_ms', {
      p95Ms: p95,
      samples: checkoutToPaidSamples.length,
      thresholdMs: PHASE1_MISSION_ALERT_THRESHOLDS.checkoutToPaidP95Ms,
    });
  }
}

/** @param {boolean} [simulateFailure] — push synthetic bad webhook samples for proof scripts. */
export function simulateMissionWebhookFailuresForProof(count = 30) {
  for (let i = 0; i < count; i += 1) {
    windowWebhookSig.push({ t: Date.now(), ok: false });
  }
  pruneWebhookWindow();
  evaluatePhase1MissionAlerts();
}

export function getPhase1MissionMetricsSnapshot() {
  return {
    schema: PHASE1_MISSION_LOG_SCHEMA,
    counters: { ...counters },
    timers: {
      checkout_to_paid_ms: {
        p95: percentile95(checkoutToPaidSamples),
        samples: checkoutToPaidSamples.length,
      },
      paid_to_fulfillment_ms: {
        p95: percentile95(paidToFulfillmentSamples),
        samples: paidToFulfillmentSamples.length,
      },
    },
    windows: {
      webhook_sig: {
        samples: windowWebhookSig.length,
        invalidRate: webhookInvalidSigRate(),
      },
    },
    alertThresholds: { ...PHASE1_MISSION_ALERT_THRESHOLDS },
  };
}

/** Test-only reset. */
export function resetPhase1MissionObservabilityForTests() {
  for (const k of Object.keys(counters)) counters[k] = 0;
  windowWebhookSig.length = 0;
  checkoutToPaidSamples.length = 0;
  paidToFulfillmentSamples.length = 0;
  checkoutCreatedAtMs.clear();
  paidAtMsByCheckout.clear();
}
