import test from 'node:test';
import assert from 'node:assert/strict';

import {
  computeActualNetMarginBp,
  parseUsdBalanceTransaction,
} from '../src/services/paymentCheckoutStripeFeeService.js';

test('computeActualNetMarginBp matches Phase 1 formula (bp)', () => {
  // final 1000, provider 880, fee 59, fx 0, risk 8 → profit 53 → 530 bp
  const bp = computeActualNetMarginBp(1000, 880, 59, 0, 8);
  assert.equal(bp, 530);
});

test('parseUsdBalanceTransaction reads fee amount net', () => {
  const p = parseUsdBalanceTransaction(
    { fee: 59, amount: 1000, net: 941 },
    'usd',
  );
  assert.equal(p.feeCents, 59);
  assert.equal(p.amountCents, 1000);
  assert.equal(p.netCents, 941);
});

test('parseUsdBalanceTransaction rejects non-usd', () => {
  assert.equal(parseUsdBalanceTransaction({ fee: 1 }, 'eur'), null);
});
