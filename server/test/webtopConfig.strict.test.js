import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import {
  collectWebtopConfigValidationIssues,
  WEBTOP_CONFIG_VALIDATION,
  WEBTOP_ENV_SLICE,
} from '../src/config/webtopConfig.js';
import {
  collectWebTopupDeploymentValidationIssuesFromEnv,
  getWebtopConfigSnapshot,
} from '../src/config/webtopDeploymentConfig.js';
import { mapWebtopUserFacingStatus } from '../src/lib/webtopUserFacingStatus.js';
import { PAYMENT_STATUS } from '../src/domain/topupOrder/statuses.js';
import { FULFILLMENT_STATUS } from '../src/domain/topupOrder/statuses.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverRoot = join(__dirname, '..');

describe('webtopConfig (strict Phase 11)', () => {
  it('collectWebtopConfigValidationIssues rejects impossibly small SLA paid-to-delivered', () => {
    const r = collectWebtopConfigValidationIssues({
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
      webtopupRetryMaxAttempts: 3,
      webtopupRetryBackoffMs: [500, 1500],
      providerCircuitFailureThreshold: 5,
    });
    assert.ok(r.errors.length > 0);
  });

  it('WEBTOP_CONFIG_VALIDATION matches collectWebtopConfigValidationIssues on frozen slice', () => {
    const live = collectWebtopConfigValidationIssues(WEBTOP_ENV_SLICE);
    const expectStatus = live.errors.length
      ? 'invalid'
      : live.warnings.length
        ? 'warn'
        : 'ok';
    assert.equal(WEBTOP_CONFIG_VALIDATION.status, expectStatus);
    assert.deepEqual(WEBTOP_CONFIG_VALIDATION.errors, live.errors);
    assert.deepEqual(WEBTOP_CONFIG_VALIDATION.warnings, live.warnings);
  });

  it('getWebtopConfigSnapshot has no secret-shaped strings', () => {
    const s = getWebtopConfigSnapshot();
    const j = JSON.stringify(s);
    assert.ok(!j.includes('sk_live'));
    assert.ok(!j.includes('sk_test'));
    assert.ok(!j.includes('whsec_'));
    assert.ok(!j.includes('postgres://'));
    assert.ok(s.flags);
    assert.equal(typeof s.flags.slaEnforcementEnabled, 'boolean');
    assert.equal(typeof s.flags.abuseProtectionEnabled, 'boolean');
    assert.ok(s.thresholds?.sla);
  });

  it('delegates collectWebTopupDeploymentValidationIssuesFromEnv to shared validator', () => {
    const a = collectWebtopConfigValidationIssues({
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
      webtopupRetryMaxAttempts: 3,
      webtopupRetryBackoffMs: [500, 1500],
      providerCircuitFailureThreshold: 5,
    });
    const b = collectWebTopupDeploymentValidationIssuesFromEnv({
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
      webtopupRetryMaxAttempts: 3,
      webtopupRetryBackoffMs: [500, 1500],
      providerCircuitFailureThreshold: 5,
    });
    assert.deepEqual(a.errors, b.errors);
  });

  it('mapWebtopUserFacingStatus is identical for the same row regardless of unrelated env (pure)', () => {
    const row = {
      paymentStatus: PAYMENT_STATUS.PAID,
      fulfillmentStatus: FULFILLMENT_STATUS.QUEUED,
      fulfillmentErrorCode: null,
      fulfillmentNextRetryAt: null,
    };
    const a = mapWebtopUserFacingStatus(row);
    const oldStripe = process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake_for_mapping_test';
    try {
      const b = mapWebtopUserFacingStatus(row);
      assert.deepEqual(a, b);
    } finally {
      if (oldStripe === undefined) delete process.env.STRIPE_SECRET_KEY;
      else process.env.STRIPE_SECRET_KEY = oldStripe;
    }
  });

  it('assertWebTopupDeploymentConfigOrExit exits in production when SLA is invalid', () => {
    const r = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `import { assertWebTopupDeploymentConfigOrExit } from './src/config/webtopDeploymentConfig.js';
assertWebTopupDeploymentConfigOrExit();`,
      ],
      {
        cwd: serverRoot,
        encoding: 'utf8',
        env: {
          ...process.env,
          NODE_ENV: 'production',
          WEBTOPUP_SLA_PAID_TO_DELIVERED_MAX_MS: '30000',
        },
      },
    );
    assert.equal(r.status, 1, r.stderr || r.stdout);
  });
});
