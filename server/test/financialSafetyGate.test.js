import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { env } from '../src/config/env.js';
import { PAYMENT_FULFILLMENT_RECON_STATUS } from '../src/constants/paymentFulfillmentReconciliationStatus.js';
import { PROVIDER_TRUTH_STATUS } from '../src/constants/providerTruthStatus.js';
import {
  evaluateFinancialSafetyLock,
  evaluateFulfillmentMoneyGate,
} from '../src/lib/financialSafetyGate.js';

/**
 * Row that passes `evaluateFinancialSafetyLock` when enabled (trust/fraud/provider/recon).
 */
function moneyGateSafeBaseline(overrides = {}) {
  return {
    trustScore: 100,
    fraudRiskScore: 0,
    providerTruthStatus: PROVIDER_TRUTH_STATUS.OK,
    reconciliationStatus: PAYMENT_FULFILLMENT_RECON_STATUS.OK,
    ...overrides,
  };
}

describe('financialSafetyGate (L12 financial safety / money path)', () => {
  it('evaluateFulfillmentMoneyGate allows low fraud when other gates pass', () => {
    const t = env.fraudRiskFulfillmentBlockThreshold;
    const r = evaluateFulfillmentMoneyGate(
      moneyGateSafeBaseline({
        fraudRiskScore: Math.max(0, t - 1),
      }),
    );
    assert.equal(r.ok, true);
  });

  it('evaluateFulfillmentMoneyGate blocks at fraud block threshold', () => {
    const t = env.fraudRiskFulfillmentBlockThreshold;
    const r = evaluateFulfillmentMoneyGate(
      moneyGateSafeBaseline({
        fraudRiskScore: t,
      }),
    );
    assert.equal(r.ok, false);
    assert.equal(r.code, 'FRAUD_RISK_HIGH');
  });

  it('evaluateFinancialSafetyLock enforces fraud when full lock is enabled', () => {
    if (!env.financialSafetyLockEnabled) {
      const r = evaluateFinancialSafetyLock(
        moneyGateSafeBaseline({ fraudRiskScore: 0 }),
      );
      assert.equal(r.ok, true);
      assert.equal(r.code, 'lock_disabled');
      return;
    }
    const r = evaluateFinancialSafetyLock(
      moneyGateSafeBaseline({
        fraudRiskScore: env.fraudRiskFulfillmentBlockThreshold,
      }),
    );
    assert.equal(r.ok, false);
    assert.equal(r.code, 'FRAUD_RISK_HIGH');
  });

  it('evaluateFulfillmentMoneyGate blocks low trust when TRUST_SCORE_FULFILLMENT_BLOCK is on', () => {
    if (!env.trustScoreFulfillmentBlock) {
      return;
    }
    const r = evaluateFulfillmentMoneyGate(
      moneyGateSafeBaseline({
        trustScore: 40,
        fraudRiskScore: 0,
      }),
    );
    assert.equal(r.ok, false);
    assert.equal(r.code, 'TRUST_SCORE_BLOCKED');
  });

  it('evaluateFinancialSafetyLock blocks low trust when full safety lock is on', () => {
    if (!env.financialSafetyLockEnabled) {
      return;
    }
    const min = env.financialSafetyMinTrustScore;
    const r = evaluateFinancialSafetyLock(
      moneyGateSafeBaseline({
        trustScore: Math.max(0, min - 1),
        fraudRiskScore: 0,
      }),
    );
    assert.equal(r.ok, false);
    assert.equal(r.code, 'TRUST_TOO_LOW');
  });

  it('provider truth mismatch blocks only when financial safety lock is enabled', () => {
    const row = moneyGateSafeBaseline({
      providerTruthStatus: PROVIDER_TRUTH_STATUS.MISMATCH,
      reconciliationStatus: PAYMENT_FULFILLMENT_RECON_STATUS.OK,
    });
    const r = evaluateFulfillmentMoneyGate(row);
    if (!env.financialSafetyLockEnabled) {
      assert.equal(r.ok, true);
      return;
    }
    assert.equal(r.ok, false);
    assert.equal(r.code, 'PROVIDER_TRUTH_MISMATCH');
  });

  it('unknown provider truth + reconciliation REQUIRED blocks when safety lock is enabled', () => {
    const row = moneyGateSafeBaseline({
      providerTruthStatus: PROVIDER_TRUTH_STATUS.UNKNOWN,
      reconciliationStatus: PAYMENT_FULFILLMENT_RECON_STATUS.REQUIRED,
    });
    const r = evaluateFulfillmentMoneyGate(row);
    if (!env.financialSafetyLockEnabled) {
      assert.equal(r.ok, true);
      return;
    }
    assert.equal(r.ok, false);
    assert.equal(r.code, 'PROVIDER_TRUTH_UNKNOWN_RECON_REQUIRED');
  });
});
