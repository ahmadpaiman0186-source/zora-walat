import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ORDER_STATUS } from '../src/constants/orderStatus.js';
import { RECONCILIATION_STATUS } from '../src/constants/reconciliationStatus.js';
import { FINANCIAL_ANOMALY } from '../src/constants/financialAnomaly.js';
import {
  computePhase1MarginUsdSurface,
  deriveReconciliationStatus,
} from '../src/lib/phase1MarginReconciliation.js';

function baseCheckout(overrides = {}) {
  return {
    amountUsdCents: 10_000,
    projectedNetMarginBp: 300,
    stripeFeeActualUsdCents: 320,
    stripeFeeEstimateUsdCents: 330,
    providerCostUsdCents: 9000,
    providerCostActualUsdCents: 9000,
    fxBufferUsdCents: 0,
    riskBufferUsdCents: 0,
    orderStatus: ORDER_STATUS.FULFILLED,
    financialAnomalyCodes: [],
    ...overrides,
  };
}

describe('phase1MarginReconciliation', () => {
  it('computes expected margin from projected BP', () => {
    const s = computePhase1MarginUsdSurface(baseCheckout());
    assert.equal(s.expectedMarginUsd, 3);
    assert.equal(typeof s.actualMarginUsd, 'number');
    assert.ok(s.marginDeltaUsd != null);
  });

  it('leaves actual margin null until Stripe fee actual is known', () => {
    const s = computePhase1MarginUsdSurface(
      baseCheckout({ stripeFeeActualUsdCents: null }),
    );
    assert.equal(s.expectedMarginUsd, 3);
    assert.equal(s.actualMarginUsd, null);
    assert.equal(s.marginDeltaUsd, null);
  });

  it('deriveReconciliationStatus: MISMATCH when anomaly codes present', () => {
    const st = deriveReconciliationStatus(baseCheckout(), [FINANCIAL_ANOMALY.LOW_MARGIN]);
    assert.equal(st, RECONCILIATION_STATUS.MISMATCH);
  });

  it('deriveReconciliationStatus: UNKNOWN before terminal delivery', () => {
    const st = deriveReconciliationStatus(
      baseCheckout({ orderStatus: ORDER_STATUS.PAID, financialAnomalyCodes: [] }),
      [],
    );
    assert.equal(st, RECONCILIATION_STATUS.UNKNOWN);
  });

  it('deriveReconciliationStatus: UNKNOWN when delivered but fee actual missing', () => {
    const st = deriveReconciliationStatus(
      baseCheckout({ stripeFeeActualUsdCents: null }),
      [],
    );
    assert.equal(st, RECONCILIATION_STATUS.UNKNOWN);
  });

  it('deriveReconciliationStatus: MATCH when delivered, fee known, no anomalies', () => {
    const st = deriveReconciliationStatus(baseCheckout(), []);
    assert.equal(st, RECONCILIATION_STATUS.MATCH);
  });
});
