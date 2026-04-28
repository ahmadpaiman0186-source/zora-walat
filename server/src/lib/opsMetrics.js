/**
 * In-process counters + rolling samples for rate-based alerts (single-instance view).
 * When `METRICS_REDIS_AGGREGATION=true`, counters also mirror to Redis for cluster-wide Prometheus scrape.
 */

import { scheduleLegacyCounterIncr, scheduleHistogramObserve } from './redisMetricsAggregator.js';
import { getRedisDegradeCounters } from './redisDegradeSignals.js';

/** @type {Record<string, number>} */
const counters = {};

/** @type {{ t: number, ok: boolean }[]} */
const windowPayment = [];
/** @type {{ t: number, ok: boolean }[]} */
const windowFulfillment = [];
/** @type {{ t: number, ok: boolean }[]} */
const windowPush = [];

const WINDOW_MS = 15 * 60 * 1000;
const MAX_SAMPLES = 200;

function prune(arr) {
  const now = Date.now();
  while (arr.length && now - arr[0].t > WINDOW_MS) {
    arr.shift();
  }
  while (arr.length > MAX_SAMPLES) {
    arr.shift();
  }
}

function pushWindow(arr, ok) {
  arr.push({ t: Date.now(), ok });
  prune(arr);
}

function windowFailureRate(arr) {
  prune(arr);
  if (arr.length < 8) return null;
  const fails = arr.filter((x) => !x.ok).length;
  return fails / arr.length;
}

/**
 * @param {string} name
 * @param {number} [delta]
 */
export function bumpCounter(name, delta = 1) {
  counters[name] = (counters[name] ?? 0) + delta;
  scheduleLegacyCounterIncr(name, delta);
}

/**
 * @param {boolean} success
 */
export function recordPaymentCheckoutOutcome(success) {
  bumpCounter(success ? 'payment_checkout_ok' : 'payment_checkout_fail');
  pushWindow(windowPayment, success);
}

/**
 * @param {'delivered' | 'failed' | 'noop'} outcome
 */
export function recordFulfillmentTerminalOutcome(outcome) {
  if (outcome === 'delivered') {
    bumpCounter('fulfillment_delivered');
    pushWindow(windowFulfillment, true);
  } else if (outcome === 'failed') {
    bumpCounter('fulfillment_failed');
    pushWindow(windowFulfillment, false);
  } else {
    bumpCounter('fulfillment_terminal_noop');
  }
}

/** Fulfillment worker started (for volume / saturation; not an outcome). */
export function recordFulfillmentRunStarted() {
  bumpCounter('fulfillment_run_started');
}

/**
 * Paid order remains non-terminal; staff/automation may need to act.
 * Stable `reason` tokens (snake_case) for dashboards.
 * @param {string} reason
 */
export function recordFulfillmentManualInterventionPath(reason) {
  if (typeof reason !== 'string' || !reason.trim()) return;
  bumpCounter('fulfillment_manual_intervention_total');
  bumpCounter(
    `fulfillment_manual_${String(reason).replace(/[^a-z0-9_]/gi, '_').slice(0, 72)}`,
  );
}

/** Phase 1 financial anomaly codes persisted on PaymentCheckout (count for ops dashboards). */
export function recordPhase1FinancialAnomalyCodes(codes) {
  if (!Array.isArray(codes) || codes.length === 0) return;
  bumpCounter('phase1_financial_anomaly_order_total');
  for (const c of codes) {
    if (typeof c !== 'string' || !c.trim()) continue;
    bumpCounter(`phase1_anomaly_${String(c).replace(/[^A-Z0-9_]/gi, '_').slice(0, 48)}`);
  }
}

export function recordPhase1StuckSignalObserved(signal) {
  if (typeof signal !== 'string' || !signal.trim()) return;
  bumpCounter('phase1_stuck_signal_total');
  bumpCounter(`phase1_stuck_${String(signal).replace(/[^A-Z0-9_]/gi, '_').slice(0, 64)}`);
}

export function recordCheckoutSessionCreated() {
  bumpCounter('checkout_session_created_total');
}

/**
 * Retry / idempotency signals (volumes for capacity planning — not failure windows).
 * @param {'webhook_event_duplicate' | 'webtop_fulfillment_retry' | string} kind
 */
export function recordRetry(kind) {
  bumpCounter(`retry_${String(kind).replace(/[^a-z0-9_]/gi, '_').slice(0, 64)}`);
}

/**
 * Decision-grade money-path signals (fulfillment idempotency, stalls, DLQ pressure).
 * @param {string} signal snake_case or dotted token; normalized to counter suffix.
 */
export function recordMoneyPathOpsSignal(signal) {
  if (typeof signal !== 'string' || !signal.trim()) return;
  bumpCounter('money_path_signal_total');
  bumpCounter(
    `money_path_${String(signal).replace(/[^a-z0-9_]/gi, '_').slice(0, 80)}`,
  );
}

/**
 * Reconciliation scan: one bump per finding (per code) for divergence-rate SLO plumbing.
 * @param {string} divergenceCode
 */
export function recordPhase1ReconciliationFinding(divergenceCode) {
  const c = String(divergenceCode ?? '').trim();
  if (!c) return;
  bumpCounter('phase1_reconciliation_finding_total');
  bumpCounter(`phase1_recon_find_${c.replace(/[^A-Z0-9_]/gi, '_').slice(0, 72)}`);
}

/**
 * Phase1 executeDelivery wall time (orchestration → provider adapter return), ms.
 * @param {number} ms
 */
export function recordFulfillmentMoneyPathDurationMs(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n < 0) return;
  bumpCounter('fulfillment_money_path_duration_observe_total');
  scheduleHistogramObserve(
    'zora_fulfillment_money_path_duration_milliseconds',
    { path: 'phase1_execute_delivery' },
    Math.min(n, 300_000),
  );
}

/**
 * @param {'ok' | 'partial_failure' | 'error' | 'skipped' | 'no_tokens' | 'disabled'} kind
 * @param {number} [failureCount]
 */
export function recordPushDelivery(kind, failureCount = 0) {
  bumpCounter(`push_${kind}`);
  if (failureCount > 0) {
    bumpCounter('push_token_failures', failureCount);
  }
  const ok =
    kind === 'ok' ||
    kind === 'skipped' ||
    kind === 'no_tokens' ||
    kind === 'disabled';
  pushWindow(windowPush, ok);
}

/** For alert evaluation (read-only references to rolling windows). */
export function getOpsAlertWindows() {
  return {
    payment: windowPayment,
    fulfillment: windowFulfillment,
    push: windowPush,
  };
}

/**
 * @param {string} routeKey normalized route bucket
 * @param {number} ms
 */
export function recordHttpLatency(routeKey, ms) {
  bumpCounter('http_requests_total');
  const k = `http_latency_sum_ms__${routeKey}`;
  counters[k] = (counters[k] ?? 0) + ms;
  bumpCounter(`http_latency_count__${routeKey}`);
  scheduleHistogramObserve(
    'zora_http_request_duration_milliseconds',
    { route: String(routeKey).slice(0, 64) },
    ms,
  );
}

/**
 * @param {string} path Express req path / originalUrl
 */
export function normalizeRouteKey(path) {
  const p = String(path ?? '').split('?')[0];
  if (p.startsWith('/webhooks/stripe')) return 'webhooks_stripe';
  if (p.startsWith('/api/recharge')) return 'api_recharge';
  if (p.startsWith('/api/wallet')) return 'api_wallet';
  if (p.startsWith('/api/transactions')) return 'api_transactions';
  if (p.startsWith('/api/loyalty')) return 'api_loyalty';
  if (p.startsWith('/api/notifications')) return 'api_notifications';
  if (p.startsWith('/api/admin')) return 'api_admin';
  if (p.startsWith('/auth')) return 'auth';
  if (p.startsWith('/catalog')) return 'catalog';
  if (p === '/ready' || p === '/health' || p === '/metrics') return 'health';
  return 'other';
}

export function getOpsMetricsSnapshot() {
  return {
    counters: { ...counters },
    redisInfra: getRedisDegradeCounters(),
    sloHints: {
      /** Rolling 15m windows — null until enough samples; >0.15 fulfillment failure rate is dangerous for paging. */
      fulfillmentFailureRateWarnThreshold: 0.15,
      paymentFailureRateWarnThreshold: 0.15,
      fulfillmentLatencyHistogram: 'zora_fulfillment_money_path_duration_milliseconds',
      moneyPathSignalPrefix: 'money_path_',
      /** Examples: `money_path_wallet_topup_idempotent_applied`, `wallet_topup_reject_idempotency_required`. */
      walletTopupIdempotencySignalsDoc:
        'money_path_wallet_topup_* + reject_* counters on 400/409 idempotency paths',
      dlqRecordCounter: 'phase1_fulfillment_dlq_record_total',
    },
    windows: {
      collectedAt: new Date().toISOString(),
      windowMinutes: WINDOW_MS / 60_000,
      paymentFailureRate: windowFailureRate(windowPayment),
      fulfillmentFailureRate: windowFailureRate(windowFulfillment),
      pushFailureRate: windowFailureRate(windowPush),
      paymentSamples: windowPayment.length,
      fulfillmentSamples: windowFulfillment.length,
      pushSamples: windowPush.length,
    },
  };
}

/** Test-only helper for deterministic counter assertions. */
export function resetOpsMetricsForTests() {
  for (const key of Object.keys(counters)) {
    delete counters[key];
  }
  windowPayment.length = 0;
  windowFulfillment.length = 0;
  windowPush.length = 0;
}

export { windowFailureRate };
