import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { resetSharedCircuitBreakersForTests } from '../src/services/reliability/circuitBreaker.js';
import {
  computeActualNetMarginBp,
  fetchUsdFeeFromPaymentIntent,
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

beforeEach(() => {
  resetSharedCircuitBreakersForTests();
});

test('fetchUsdFeeFromPaymentIntent retries transient Stripe read on PI retrieve', async () => {
  let n = 0;
  const stripe = {
    paymentIntents: {
      retrieve: async () => {
        n += 1;
        if (n < 2) {
          const e = new Error('conn');
          e.type = 'StripeConnectionError';
          throw e;
        }
        return {
          currency: 'usd',
          latest_charge: {
            id: 'ch_1',
            balance_transaction: { id: 'txn_1', fee: 30, amount: 5000, net: 4970 },
          },
        };
      },
    },
    balanceTransactions: {
      retrieve: async () => {
        throw new Error('should not be called');
      },
    },
  };
  const out = await fetchUsdFeeFromPaymentIntent(stripe, 'pi_test');
  assert.ok(out);
  assert.equal(out.feeCents, 30);
  assert.equal(n, 2);
});

test('fetchUsdFeeFromPaymentIntent retrieves balance transaction when only id string is present', async () => {
  let btCalls = 0;
  const stripe = {
    paymentIntents: {
      retrieve: async () => ({
        currency: 'usd',
        latest_charge: {
          id: 'ch_1',
          balance_transaction: 'txn_str_1',
        },
      }),
    },
    balanceTransactions: {
      retrieve: async (id) => {
        btCalls += 1;
        assert.equal(id, 'txn_str_1');
        return { id: 'txn_str_1', fee: 25, amount: 5000, net: 4975 };
      },
    },
  };
  const out = await fetchUsdFeeFromPaymentIntent(stripe, 'pi_bt');
  assert.ok(out);
  assert.equal(out.feeCents, 25);
  assert.equal(btCalls, 1);
});
