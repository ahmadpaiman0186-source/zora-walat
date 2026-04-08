/**
 * Scale-gate blockers (`npm run gate:check:scale`) — pure checklist from measured inputs.
 * Keeps rules testable without spawning processes or fighting dotenv override in development.
 *
 * @param {object} p
 * @param {boolean} p.fulfillmentQueueEnabledFlag
 * @param {boolean} p.metricsPrometheusEnabled
 * @param {boolean} p.metricsRedisAggregation
 * @param {boolean} p.scaleGateRequireRedisMetricsAggregation
 * @param {string} p.airtimeProvider
 * @param {boolean} p.scaleGateAllowMockAirtime
 * @param {boolean} p.requireWalletTopupIdempotencyKey
 * @param {boolean | null} p.redisPingOk
 * @param {boolean} p.redisUrlPresent
 * @param {number} p.ledgerCritical
 * @param {number} p.inconsistentFindings
 * @param {number} p.stallFindings
 * @param {number} p.preHttpStaleFindings
 * @returns {string[]}
 */
export function computeScaleBlockers({
  fulfillmentQueueEnabledFlag,
  metricsPrometheusEnabled,
  metricsRedisAggregation,
  scaleGateRequireRedisMetricsAggregation,
  airtimeProvider,
  scaleGateAllowMockAirtime,
  requireWalletTopupIdempotencyKey,
  redisPingOk,
  redisUrlPresent,
  ledgerCritical,
  inconsistentFindings,
  stallFindings,
  preHttpStaleFindings,
}) {
  /** @type {string[]} */
  const scaleBlockers = [];
  if (airtimeProvider === 'mock' && !scaleGateAllowMockAirtime) {
    scaleBlockers.push('scale:mock_airtime_not_allowed_for_scale_gate');
  }
  if (
    fulfillmentQueueEnabledFlag &&
    metricsPrometheusEnabled &&
    scaleGateRequireRedisMetricsAggregation &&
    !metricsRedisAggregation
  ) {
    scaleBlockers.push(
      'scale:METRICS_PROMETHEUS_ENABLED+FULFILLMENT_QUEUE requires METRICS_REDIS_AGGREGATION=true for cluster SLOs',
    );
  }
  if (!requireWalletTopupIdempotencyKey) {
    scaleBlockers.push(
      'scale:REQUIRE_WALLET_TOPUP_IDEMPOTENCY_KEY must be true for wallet replay safety',
    );
  }
  if (redisPingOk !== true || !redisUrlPresent) {
    scaleBlockers.push('scale:redis_required_healthy_for_queue+circuits+shadow');
  }
  if (
    ledgerCritical > 0 ||
    inconsistentFindings > 0 ||
    stallFindings > 0 ||
    preHttpStaleFindings > 0
  ) {
    scaleBlockers.push('scale:reconciliation_must_be_clean');
  }
  return scaleBlockers;
}
