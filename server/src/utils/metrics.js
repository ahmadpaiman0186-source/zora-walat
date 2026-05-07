/**
 * Resilience / money-path observability metrics (thin façade over `lib/opsMetrics.js`).
 * Stable counter names for dashboards and log pipelines.
 */

import { randomUUID } from 'node:crypto';

import {
  bumpCounter,
  recordPaymentCheckoutOutcome,
  recordFulfillmentTerminalOutcome,
} from '../lib/opsMetrics.js';
import { sanitizePhase1ObservabilityFields } from '../infrastructure/logging/phase1ObservabilitySanitize.js';

export const RESILIENCE_METRIC = Object.freeze({
  PAYMENT_SUCCESS_RATE: 'payment_success_rate',
  FULFILLMENT_SUCCESS_RATE: 'fulfillment_success_rate',
  RECOVERY_RATE: 'recovery_rate',
  FAILURE_RATE: 'failure_rate',
});

/**
 * @param {string} name
 * @param {number} [delta]
 */
export function bumpMetric(name, delta = 1) {
  bumpCounter(name, delta);
}

/**
 * @param {boolean} ok
 */
export function trackPaymentSuccessSample(ok) {
  recordPaymentCheckoutOutcome(ok);
  bumpCounter('payment_success_rate_observations', 1);
  bumpCounter(ok ? 'payment_success_rate_ok' : 'payment_success_rate_fail', 1);
}

/**
 * @param {'delivered' | 'failed' | 'noop'} outcome
 */
export function trackFulfillmentTerminalSample(outcome) {
  recordFulfillmentTerminalOutcome(outcome);
  bumpCounter('fulfillment_success_rate_observations', 1);
  if (outcome === 'delivered') {
    bumpCounter('fulfillment_success_rate_ok', 1);
  } else if (outcome === 'failed') {
    bumpCounter('fulfillment_success_rate_fail', 1);
    bumpCounter('failure_rate_observations', 1);
  }
}

/**
 * @param {boolean} recovered
 */
export function trackRecoverySample(recovered) {
  bumpCounter('recovery_rate_observations', 1);
  bumpCounter(recovered ? 'recovery_rate_ok' : 'recovery_rate_noop', 1);
}

export function bumpFinancialSlaBreachMetric() {
  bumpCounter('financial_sla_breach_total', 1);
}

export function bumpFinancialSlaStillOverdueMetric() {
  bumpCounter('financial_sla_still_overdue_tick_total', 1);
}

/**
 * @param {'alert' | 'block' | string} kind
 */
export function bumpFraudDetectionMetric(kind) {
  const k = String(kind).replace(/[^a-z0-9_]/gi, '_').slice(0, 48);
  bumpCounter(`fraud_detection_${k}_total`, 1);
  bumpCounter('fraud_detection_observations_total', 1);
}

/**
 * @param {'verified' | 'failed' | 'recon_pending' | 'unknown_truth' | string} outcome
 */
export function bumpRecoveryClosedLoopMetric(outcome) {
  const o = String(outcome).replace(/[^a-z0-9_]/gi, '_').slice(0, 48);
  bumpCounter(`recovery_closed_loop_${o}_total`, 1);
}

/** Provider truth mismatch (dashboard rate; provider path also bumps specifics). */
export function bumpProviderMismatchObservedMetric() {
  bumpCounter('provider_truth_mismatch_observed_total', 1);
}

/**
 * Structured L7-style resilience log. `extra` is passed through `sanitizePhase1ObservabilityFields` before emit.
 *
 * @param {{
 *   orderId?: string | null,
 *   checkoutId?: string | null,
 *   stage: 'payment' | 'fulfillment' | 'reconciliation' | 'recovery' | 'provider_verification',
 *   status: string,
 *   latencyMs?: number | null,
 *   errorCode?: string | null,
 *   traceId?: string | null,
 *   extra?: Record<string, unknown>,
 * }} p
 */
export function emitResilienceStructuredLog(p) {
  const traceId = p.traceId ?? null;
  const extraSafe =
    p.extra && typeof p.extra === 'object'
      ? sanitizePhase1ObservabilityFields(
          /** @type {Record<string, unknown>} */ (p.extra),
        )
      : {};
  console.log(
    JSON.stringify({
      moneyPathResilience: true,
      schema: 'zora.resilience.v1',
      orderId: p.orderId ?? null,
      checkoutId: p.checkoutId ?? p.orderId ?? null,
      stage: p.stage,
      status: p.status,
      latencyMs: p.latencyMs ?? null,
      errorCode: p.errorCode ?? null,
      traceId,
      t: new Date().toISOString(),
      ...extraSafe,
    }),
  );
}

/**
 * @returns {string}
 */
export function newResilienceTraceId() {
  return randomUUID();
}
