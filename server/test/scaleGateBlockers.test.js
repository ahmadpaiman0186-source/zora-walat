import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { computeScaleBlockers } from '../src/lib/scaleGateBlockers.js';

const baseOk = {
  fulfillmentQueueEnabledFlag: true,
  metricsPrometheusEnabled: false,
  metricsRedisAggregation: false,
  scaleGateRequireRedisMetricsAggregation: true,
  airtimeProvider: 'reloadly',
  scaleGateAllowMockAirtime: false,
  requireWalletTopupIdempotencyKey: true,
  redisPingOk: true,
  redisUrlPresent: true,
  ledgerCritical: 0,
  inconsistentFindings: 0,
  stallFindings: 0,
  preHttpStaleFindings: 0,
};

describe('computeScaleBlockers', () => {
  it('blocks scale when wallet idempotency key is not required', () => {
    const b = computeScaleBlockers({
      ...baseOk,
      requireWalletTopupIdempotencyKey: false,
    });
    assert.ok(
      b.some((x) => x.includes('REQUIRE_WALLET_TOPUP_IDEMPOTENCY_KEY')),
      JSON.stringify(b),
    );
  });

  it('passes wallet policy when idempotency key is required and redis + recon are clean', () => {
    const b = computeScaleBlockers(baseOk);
    assert.ok(
      !b.some((x) => x.includes('REQUIRE_WALLET_TOPUP_IDEMPOTENCY_KEY')),
    );
  });

  it('blocks scale when Prometheus+queue expects Redis aggregation but it is off', () => {
    const b = computeScaleBlockers({
      ...baseOk,
      metricsPrometheusEnabled: true,
      metricsRedisAggregation: false,
    });
    assert.ok(b.some((x) => x.includes('METRICS_REDIS_AGGREGATION')), JSON.stringify(b));
  });
});
