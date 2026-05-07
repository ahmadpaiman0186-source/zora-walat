import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';

import {
  getOpsMetricsSnapshot,
  resetOpsMetricsForTests,
} from '../src/lib/opsMetrics.js';
import { renderPrometheusTextLocalOnly } from '../src/lib/prometheusTextFormat.js';
import {
  RESILIENCE_METRIC,
  bumpFinancialSlaBreachMetric,
  bumpFinancialSlaStillOverdueMetric,
  bumpFraudDetectionMetric,
  bumpMetric,
  bumpProviderMismatchObservedMetric,
  bumpRecoveryClosedLoopMetric,
  trackFulfillmentTerminalSample,
  trackPaymentSuccessSample,
  trackRecoverySample,
} from '../src/utils/metrics.js';

/**
 * L15: Core money-path KPI counters are stable strings (dashboard / alert rules).
 */
describe('money-path KPI metrics (L15)', () => {
  beforeEach(() => {
    resetOpsMetricsForTests();
  });

  it('RESILIENCE_METRIC names match ops counter prefixes used for rates', () => {
    assert.equal(RESILIENCE_METRIC.PAYMENT_SUCCESS_RATE, 'payment_success_rate');
    assert.equal(RESILIENCE_METRIC.FULFILLMENT_SUCCESS_RATE, 'fulfillment_success_rate');
    assert.equal(RESILIENCE_METRIC.RECOVERY_RATE, 'recovery_rate');
  });

  it('trackPaymentSuccessSample increments observation + ok/fail buckets', () => {
    trackPaymentSuccessSample(true);
    trackPaymentSuccessSample(false);
    const { counters } = getOpsMetricsSnapshot();
    assert.equal(counters.payment_success_rate_observations, 2);
    assert.equal(counters.payment_success_rate_ok, 1);
    assert.equal(counters.payment_success_rate_fail, 1);
    assert.equal(counters.payment_checkout_ok, 1);
    assert.equal(counters.payment_checkout_fail, 1);
  });

  it('trackFulfillmentTerminalSample increments fulfillment rate buckets', () => {
    trackFulfillmentTerminalSample('delivered');
    trackFulfillmentTerminalSample('failed');
    const { counters } = getOpsMetricsSnapshot();
    assert.equal(counters.fulfillment_success_rate_observations, 2);
    assert.equal(counters.fulfillment_success_rate_ok, 1);
    assert.equal(counters.fulfillment_success_rate_fail, 1);
    assert.equal(counters.fulfillment_delivered, 1);
    assert.equal(counters.fulfillment_failed, 1);
  });

  it('trackRecoverySample increments recovery_rate counters', () => {
    trackRecoverySample(true);
    trackRecoverySample(false);
    const { counters } = getOpsMetricsSnapshot();
    assert.equal(counters.recovery_rate_observations, 2);
    assert.equal(counters.recovery_rate_ok, 1);
    assert.equal(counters.recovery_rate_noop, 1);
  });

  it('SLA, fraud, recovery closed-loop, provider mismatch bump stable totals', () => {
    bumpFinancialSlaBreachMetric();
    bumpFinancialSlaStillOverdueMetric();
    bumpFraudDetectionMetric('alert');
    bumpFraudDetectionMetric('block');
    bumpRecoveryClosedLoopMetric('verified');
    bumpProviderMismatchObservedMetric();
    const { counters } = getOpsMetricsSnapshot();
    assert.equal(counters.financial_sla_breach_total, 1);
    assert.equal(counters.financial_sla_still_overdue_tick_total, 1);
    assert.equal(counters.fraud_detection_alert_total, 1);
    assert.equal(counters.fraud_detection_block_total, 1);
    assert.equal(counters.fraud_detection_observations_total, 2);
    assert.equal(counters.recovery_closed_loop_verified_total, 1);
    assert.equal(counters.provider_truth_mismatch_observed_total, 1);
  });

  it('money_path_alert metrics use normalized code suffix (no raw user input in name)', () => {
    bumpMetric('money_path_alert_critical_sla_fulfillment_breach', 1);
    const { counters } = getOpsMetricsSnapshot();
    assert.equal(counters.money_path_alert_critical_sla_fulfillment_breach, 1);
  });

  it('Prometheus text export contains key KPI counter names', () => {
    bumpFinancialSlaBreachMetric();
    trackPaymentSuccessSample(true);
    const text = renderPrometheusTextLocalOnly();
    assert.ok(text.includes('payment_success_rate_ok'));
    assert.ok(text.includes('financial_sla_breach_total'));
    assert.ok(text.includes('zora_ops_counters'));
  });
});
