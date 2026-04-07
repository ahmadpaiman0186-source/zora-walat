import test from 'node:test';
import assert from 'node:assert/strict';

import {
  collectFinancialAnomalyCodes,
  computeRefinedProfitAndMarginBp,
  mergeAnomalyCodes,
} from '../src/services/financialTruthService.js';
import { FINANCIAL_ANOMALY } from '../src/constants/financialAnomaly.js';
import { ORDER_STATUS } from '../src/constants/orderStatus.js';

test('computeRefinedProfitAndMarginBp prefers actual provider when set', () => {
  const order = {
    amountUsdCents: 1000,
    providerCostUsdCents: 880,
    providerCostActualUsdCents: 900,
    stripeFeeActualUsdCents: 59,
    stripeFeeEstimateUsdCents: 58,
    fxBufferUsdCents: 0,
    riskBufferUsdCents: 8,
  };
  const r = computeRefinedProfitAndMarginBp(order);
  assert.equal(r.providerCentsUsed, 900);
  assert.equal(r.stripeFeeCentsUsed, 59);
  assert.equal(r.profitCents, 1000 - 900 - 59 - 0 - 8);
});

test('collectFinancialAnomalyCodes detects STRIPE_AMOUNT_MISMATCH', () => {
  const codes = collectFinancialAnomalyCodes({
    amountUsdCents: 1000,
    stripeBalanceTransactionAmountCents: 999,
    orderStatus: ORDER_STATUS.PENDING,
  });
  assert.ok(codes.includes(FINANCIAL_ANOMALY.STRIPE_AMOUNT_MISMATCH));
});

test('mergeAnomalyCodes dedupes', () => {
  const m = mergeAnomalyCodes(['LOW_MARGIN'], ['LOW_MARGIN', 'NEGATIVE_MARGIN']);
  assert.deepEqual(m, ['LOW_MARGIN', 'NEGATIVE_MARGIN']);
});
