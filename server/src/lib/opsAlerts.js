import {
  getOpsAlertWindows,
  windowFailureRate,
} from './opsMetrics.js';

const THRESH = {
  failureRate: Number(process.env.OPS_ALERT_FAILURE_RATE ?? 0.35),
  minSamples: Number(process.env.OPS_ALERT_MIN_SAMPLES ?? 15),
};

/**
 * Log-based alerts (ingest via `severity:ALERT` JSON); wire to PagerDuty/Opsgenie later.
 * @param {string} name
 * @param {{ t: number, ok: boolean }[]} windowArr
 * @param {Record<string, unknown>} [extra]
 */
export function maybeEmitRateAlert(name, windowArr, extra = {}) {
  const rate = windowFailureRate(windowArr);
  if (rate == null) return;
  if (windowArr.length < THRESH.minSamples) return;
  if (rate < THRESH.failureRate) return;

  console.warn(
    JSON.stringify({
      severity: 'ALERT',
      alert: 'high_failure_rate_window',
      name,
      failureRate: Math.round(rate * 1000) / 1000,
      samples: windowArr.length,
      threshold: THRESH.failureRate,
      ...extra,
    }),
  );
}

/**
 * @param {string} code
 * @param {Record<string, unknown>} [ctx]
 */
export function emitProviderDegradationAlert(code, ctx = {}) {
  console.warn(
    JSON.stringify({
      severity: 'ALERT',
      alert: 'provider_error_signal',
      code: String(code).slice(0, 128),
      ...ctx,
    }),
  );
}

/**
 * @param {Record<string, unknown>} ctx
 */
export function emitPushDegradationAlert(ctx) {
  console.warn(
    JSON.stringify({
      severity: 'ALERT',
      alert: 'push_delivery_degraded',
      ...ctx,
    }),
  );
}

/** Call after mutating samples (e.g. end of Stripe webhook handler). */
export function evaluateRollingAlerts() {
  const w = getOpsAlertWindows();
  maybeEmitRateAlert('payment_checkout_15m', w.payment);
  maybeEmitRateAlert('fulfillment_terminal_15m', w.fulfillment);
  maybeEmitRateAlert('push_delivery_15m', w.push);
}
