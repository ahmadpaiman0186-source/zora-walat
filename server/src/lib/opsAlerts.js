import {
  getOpsAlertWindows,
  getOtpDeliveryRollingSnapshot,
  windowFailureRate,
} from './opsMetrics.js';

const THRESH = {
  failureRate: Number(process.env.OPS_ALERT_FAILURE_RATE ?? 0.35),
  minSamples: Number(process.env.OPS_ALERT_MIN_SAMPLES ?? 15),
};

const OTP_SLO = {
  minDeliverySuccess: Number(process.env.OPS_OTP_DELIVERY_SUCCESS_MIN ?? 0.85),
  minSamples: Number(process.env.OPS_OTP_DELIVERY_MIN_SAMPLES ?? 15),
  warnCooldownMs: Number(process.env.OPS_OTP_DELIVERY_WARN_COOLDOWN_MS ?? 300_000),
};

/** @type {number} */
let lastOtpDeliverySloWarnAt = 0;

/** Test-only: reset OTP delivery SLO warn throttle. */
export function resetOtpDeliverySloAlertForTests() {
  lastOtpDeliverySloWarnAt = 0;
}

/**
 * WARN when rolling OTP delivery success rate falls below SLO (default 85%).
 * Throttled to avoid log storms; uses same rolling window as `otp_delivery_success_rate`.
 */
export function maybeEmitOtpDeliverySuccessWarn() {
  const snap = getOtpDeliveryRollingSnapshot();
  if (snap.samples < OTP_SLO.minSamples || snap.rate == null) return;
  if (snap.rate >= OTP_SLO.minDeliverySuccess) return;
  const now = Date.now();
  if (now - lastOtpDeliverySloWarnAt < OTP_SLO.warnCooldownMs) return;
  lastOtpDeliverySloWarnAt = now;
  console.warn(
    JSON.stringify({
      severity: 'WARN',
      alert: 'otp_delivery_success_below_slo',
      otp_delivery_success_rate: Math.round(snap.rate * 1000) / 1000,
      threshold: OTP_SLO.minDeliverySuccess,
      samples: snap.samples,
      t: new Date().toISOString(),
    }),
  );
}

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
  if (w.otpIssue?.length) {
    maybeEmitRateAlert('otp_delivery_15m', w.otpIssue);
  }
  maybeEmitOtpDeliverySuccessWarn();
}
