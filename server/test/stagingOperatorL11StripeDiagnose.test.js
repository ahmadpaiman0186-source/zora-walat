/**
 * L-11 Stripe diagnose (pure mocks — no network, no secrets).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  diagnoseL11StripePayment,
  ROOT_CAUSE,
  rootCauseToBlockedReason,
} from '../tools/stagingOperatorL11StripeDiagnose.mjs';
import { idSuffix, stripeSecretKeyMode } from '../tools/stagingOperatorL11Refund.mjs';
import { normalizeSuffixTail } from '../tools/stagingOperatorL11StripeMapping.mjs';

const TEST_KEY = `sk_test_${'a'.repeat(60)}`;
const LIVE_KEY = `sk_live_${'b'.repeat(60)}`;

const baseDb = {
  orderId: 'cmp95a2kc0003jy04pvq0dr78',
  paymentIntentIdForVerify: 'pi_test_order_pi_id_01',
  stripePaymentIntentIdSuffix: '…order_pi_id',
  amountUsdCents: 515,
  currency: 'usd',
};

function mockPi(overrides = {}) {
  return {
    id: 'pi_test_order_pi_id_01',
    amount: 515,
    currency: 'usd',
    livemode: false,
    metadata: { internalCheckoutId: baseDb.orderId },
    latest_charge: { id: 'ch_test_charge_01' },
    ...overrides,
  };
}

function mockStripe(pi, options = {}) {
  const { accountLivemode = false, searchFails = false, retrieveFails = false } =
    options;
  return {
    accounts: {
      retrieve: async () => ({
        id: 'acct_test_1234567890',
        livemode: accountLivemode,
      }),
    },
    paymentIntents: {
      retrieve: async (id) => {
        if (retrieveFails) {
          const err = new Error('No such payment_intent');
          err.code = 'resource_missing';
          throw err;
        }
        if (id !== pi.id) {
          const err = new Error('No such payment_intent');
          err.code = 'resource_missing';
          throw err;
        }
        return pi;
      },
      search: async () => {
        if (searchFails) {
          const err = new Error('permission_denied');
          err.type = 'StripePermissionError';
          throw err;
        }
        return { data: [pi] };
      },
    },
    refunds: {
      list: async () => ({ data: [] }),
    },
  };
}

describe('diagnoseL11StripePayment', () => {
  it('refuses live key', async () => {
    const d = await diagnoseL11StripePayment({
      secretRaw: LIVE_KEY,
      db: baseDb,
      stripe: mockStripe(mockPi()),
    });
    assert.equal(d.rootCauseCode, ROOT_CAUSE.STRIPE_KEY_NOT_TEST);
    assert.equal(d.stripeAccountMode, 'live_blocked');
  });

  it('detects missing key', async () => {
    const d = await diagnoseL11StripePayment({
      secretRaw: '',
      db: baseDb,
      stripe: null,
    });
    assert.equal(d.rootCauseCode, ROOT_CAUSE.STRIPE_KEY_MISSING);
    assert.equal(d.stripeKeyPresent, false);
  });

  it('detects missing payment intent (wrong account / not found)', async () => {
    const d = await diagnoseL11StripePayment({
      secretRaw: TEST_KEY,
      db: baseDb,
      stripe: mockStripe(mockPi(), { retrieveFails: true, searchFails: true }),
    });
    assert.equal(d.rootCauseCode, ROOT_CAUSE.STRIPE_PAYMENT_INTENT_NOT_FOUND);
    assert.equal(d.paymentIntentRetrieveByFullId, false);
  });

  it('detects stale DB PI suffix when full id retrieves but tail mismatches', async () => {
    const pi = mockPi({ id: 'pi_other_suffix_mismatch_id' });
    const d = await diagnoseL11StripePayment({
      secretRaw: TEST_KEY,
      db: {
        ...baseDb,
        paymentIntentIdForVerify: pi.id,
        stripePaymentIntentIdSuffix: 'wrong_suffix0',
      },
      stripe: mockStripe(pi),
    });
    assert.equal(d.rootCauseCode, ROOT_CAUSE.STALE_DB_PAYMENT_INTENT_SUFFIX);
    assert.equal(d.staleDbPiSuffix, true);
    assert.equal(d.paymentIntentSuffixMatch, false);
  });

  it('detects suffix mismatch when retrieved PI id does not match DB full id', async () => {
    const pi = mockPi({ id: 'pi_other_suffix_mismatch_id' });
    const d = await diagnoseL11StripePayment({
      secretRaw: TEST_KEY,
      db: {
        ...baseDb,
        paymentIntentIdForVerify: 'pi_db_points_elsewhere',
        stripePaymentIntentIdSuffix: normalizeSuffixTail(pi.id),
      },
      stripe: mockStripe(pi, { retrieveFails: true, searchFails: true }),
    });
    assert.equal(d.rootCauseCode, ROOT_CAUSE.STRIPE_PAYMENT_INTENT_NOT_FOUND);
    assert.equal(d.paymentIntentRetrieveByFullId, false);
  });

  it('passes with metadata warning when strong PI proof but no metadata linkage', async () => {
    const pi = mockPi({ metadata: {} });
    const stripe = mockStripe(pi);
    const d = await diagnoseL11StripePayment({
      secretRaw: TEST_KEY,
      db: {
        ...baseDb,
        stripePaymentIntentIdSuffix: normalizeSuffixTail(pi.id),
        checkoutSessionIdForVerify: '',
      },
      stripe,
    });
    assert.equal(d.rootCauseCode, ROOT_CAUSE.STRIPE_METADATA_WARNING_STRONG_PI_PROOF);
    assert.equal(d.strongPiIdProof, true);
    assert.equal(d.metadataWarningStrongPiProof, true);
    assert.equal(d.paymentIntentSuffixMatch, true);
  });

  it('passes hosted checkout PI without metadata when session has internalCheckoutId', async () => {
    const pi = mockPi({ metadata: {} });
    const stripe = mockStripe(pi);
    stripe.checkout = {
      sessions: {
        retrieve: async () => ({
          id: 'cs_test_session_01',
          metadata: { internalCheckoutId: baseDb.orderId },
          client_reference_id: baseDb.orderId,
        }),
      },
    };
    const d = await diagnoseL11StripePayment({
      secretRaw: TEST_KEY,
      db: {
        ...baseDb,
        stripePaymentIntentIdSuffix: normalizeSuffixTail(pi.id),
        checkoutSessionIdForVerify: 'cs_test_session_01',
      },
      stripe,
    });
    assert.equal(d.rootCauseCode, ROOT_CAUSE.OK);
    assert.equal(d.paymentIntentSuffixMatch, true);
    assert.equal(d.metadataOrderMatch, true);
  });

  it('detects amount mismatch', async () => {
    const pi = mockPi({ amount: 100 });
    const d = await diagnoseL11StripePayment({
      secretRaw: TEST_KEY,
      db: { ...baseDb, stripePaymentIntentIdSuffix: idSuffix(pi.id) },
      stripe: mockStripe(pi),
    });
    assert.equal(d.rootCauseCode, ROOT_CAUSE.STRIPE_AMOUNT_MISMATCH);
    assert.equal(d.amountMatch, false);
  });

  it('detects existing refund', async () => {
    const pi = mockPi();
    const stripe = mockStripe(pi);
    stripe.refunds.list = async () => ({
      data: [{ status: 'succeeded', amount: 515 }],
    });
    const d = await diagnoseL11StripePayment({
      secretRaw: TEST_KEY,
      db: { ...baseDb, stripePaymentIntentIdSuffix: idSuffix(pi.id) },
      stripe,
    });
    assert.equal(d.rootCauseCode, ROOT_CAUSE.STRIPE_REFUND_ALREADY_EXISTS);
    assert.equal(d.refundAlreadyExists, true);
  });

  it('passes when PI retrieve, amount, currency, and charge match', async () => {
    const pi = mockPi();
    const d = await diagnoseL11StripePayment({
      secretRaw: TEST_KEY,
      db: {
        ...baseDb,
        stripePaymentIntentIdSuffix: idSuffix(pi.id),
      },
      stripe: mockStripe(pi),
    });
    assert.equal(d.rootCauseCode, ROOT_CAUSE.OK);
    assert.equal(d.paymentIntentRetrieveByFullId, true);
    assert.equal(d.livemodeFalse, true);
  });
});

describe('rootCauseToBlockedReason', () => {
  it('maps metadata mismatch to stripe_account_mismatch', () => {
    assert.equal(
      rootCauseToBlockedReason(ROOT_CAUSE.STRIPE_ORDER_METADATA_MISMATCH),
      'stripe_account_mismatch',
    );
  });
});

describe('stripe key mode (no secret output)', () => {
  it('classifies test vs live prefixes only', () => {
    assert.equal(stripeSecretKeyMode(TEST_KEY), 'test');
    assert.equal(stripeSecretKeyMode(LIVE_KEY), 'live');
  });
});
