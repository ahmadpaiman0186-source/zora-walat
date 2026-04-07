/**
 * In-process counters + rolling samples for rate-based alerts (single-instance view).
 * For multi-instance production, export logs/metrics to Prometheus/Datadog; this remains the local SoT for dev + single-node.
 */

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
  if (p === '/ready' || p === '/health') return 'health';
  return 'other';
}

export function getOpsMetricsSnapshot() {
  return {
    counters: { ...counters },
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

export { windowFailureRate };
