/**
 * L-11 discover scoring (pure).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  pickBestL11RefundableCandidate,
  scoreL11RefundableCandidate,
} from '../tools/stagingOperatorL11Discover.mjs';
import { ROOT_CAUSE } from '../tools/stagingOperatorL11StripeDiagnose.mjs';
import { normalizeSuffixTail } from '../tools/stagingOperatorL11StripeMapping.mjs';

const TEST_KEY = `sk_test_${'a'.repeat(60)}`;

function mockStripe(pi) {
  return {
    accounts: {
      retrieve: async () => ({ id: 'acct_test', livemode: false }),
    },
    paymentIntents: {
      retrieve: async (id) => {
        if (id !== pi.id) throw Object.assign(new Error('missing'), { code: 'resource_missing' });
        return pi;
      },
      search: async () => ({ data: [] }),
    },
    refunds: { list: async () => ({ data: [] }) },
  };
}

describe('stagingOperatorL11Discover', () => {
  it('pickBest prefers OK over metadata warning', async () => {
    const orderOk = 'cmpok00000000000000000001';
    const orderWarn = 'cmpwarn00000000000000002';
    const piOk = {
      id: 'pi_test_ok_suffix_0001',
      amount: 500,
      currency: 'usd',
      livemode: false,
      metadata: { internalCheckoutId: orderOk },
      latest_charge: { id: 'ch_ok_1234567890' },
    };
    const piWarn = {
      id: 'pi_test_warn_suffix_002',
      amount: 500,
      currency: 'usd',
      livemode: false,
      metadata: {},
      latest_charge: { id: 'ch_warn_123456789' },
    };
    const scored = await Promise.all([
      scoreL11RefundableCandidate(
        mockStripe(piOk),
        {
          orderIdForHarness: orderOk,
          paymentIntentIdForVerify: piOk.id,
          stripePaymentIntentIdSuffix: normalizeSuffixTail(piOk.id),
          amountUsdCents: 500,
          currency: 'usd',
          paidConfirmed: true,
          fulfillmentAttemptCount: 1,
        },
        TEST_KEY,
      ),
      scoreL11RefundableCandidate(
        mockStripe(piWarn),
        {
          orderIdForHarness: orderWarn,
          paymentIntentIdForVerify: piWarn.id,
          stripePaymentIntentIdSuffix: normalizeSuffixTail(piWarn.id),
          amountUsdCents: 500,
          currency: 'usd',
          paidConfirmed: true,
          fulfillmentAttemptCount: 1,
        },
        TEST_KEY,
      ),
    ]);
    const best = pickBestL11RefundableCandidate(scored);
    assert.ok(best);
    assert.equal(best.rootCauseCode, ROOT_CAUSE.OK);
  });

  it('rejects fulfillment attempt count not equal to 1', async () => {
    const s = await scoreL11RefundableCandidate(
      mockStripe({
        id: 'pi_x',
        amount: 1,
        currency: 'usd',
        livemode: false,
        metadata: {},
        latest_charge: { id: 'ch_x' },
      }),
      {
        orderIdForHarness: 'cmp0000000000000000000001',
        paymentIntentIdForVerify: 'pi_x',
        stripePaymentIntentIdSuffix: 'x',
        amountUsdCents: 1,
        currency: 'usd',
        paidConfirmed: true,
        fulfillmentAttemptCount: 2,
      },
      TEST_KEY,
    );
    assert.equal(s.eligible, false);
    assert.equal(s.rootCauseCode, 'fulfillment_attempt_count_not_one');
  });
});
