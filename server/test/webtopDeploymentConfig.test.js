import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  collectWebTopupDeploymentValidationIssuesFromEnv,
  getWebTopupDeploymentSnapshot,
} from '../src/config/webtopDeploymentConfig.js';

describe('webtopDeploymentConfig', () => {
  it('validation flags impossibly small SLA paid-to-delivered', () => {
    const r = collectWebTopupDeploymentValidationIssuesFromEnv({
      webtopSlaPaidToDeliveredMaxMs: 30_000,
      webtopSlaPaymentPendingMaxMs: 1_800_000,
      webtopupAbuseBurstMaxPerWindow: 40,
      reconcileFulfillmentQueuedStuckAfterMs: 900_000,
      reconcileFulfillmentProcessingStuckAfterMs: 1_800_000,
      webtopupAutoRetryMaxDispatchAttempts: 3,
      webtopupAutoRetryBackoffMs: [10_000, 30_000, 60_000],
      webtopupFulfillmentJobLeaseMs: 120_000,
      webtopupDurableLogEnabled: false,
      webtopupDurableLogMaxBytes: 52_428_800,
    });
    assert.ok(r.errors.some((e) => e.includes('PAID_TO_DELIVERED')));
  });

  it('validation warns when reconcile queued threshold exceeds processing', () => {
    const r = collectWebTopupDeploymentValidationIssuesFromEnv({
      webtopSlaPaidToDeliveredMaxMs: 3_600_000,
      webtopSlaPaymentPendingMaxMs: 1_800_000,
      webtopupAbuseBurstMaxPerWindow: 40,
      reconcileFulfillmentQueuedStuckAfterMs: 5_000_000,
      reconcileFulfillmentProcessingStuckAfterMs: 1_800_000,
      webtopupAutoRetryMaxDispatchAttempts: 3,
      webtopupAutoRetryBackoffMs: [10_000, 30_000, 60_000],
      webtopupFulfillmentJobLeaseMs: 120_000,
      webtopupDurableLogEnabled: false,
      webtopupDurableLogMaxBytes: 52_428_800,
    });
    assert.ok(r.warnings.some((w) => w.includes('QUEUED_STUCK')));
  });

  it('deployment snapshot has no secret-shaped strings', () => {
    const s = getWebTopupDeploymentSnapshot();
    const j = JSON.stringify(s);
    assert.ok(!j.includes('sk_live'));
    assert.ok(!j.includes('sk_test'));
    assert.ok(!j.includes('whsec_'));
    assert.ok(!j.includes('postgres://'));
    assert.ok(s.featureFlags);
    assert.equal(typeof s.featureFlags.uxPublicFieldsEnabled, 'boolean');
    assert.ok(['ok', 'warn', 'invalid'].includes(s.validationStatus));
  });
});
