/**
 * L-11 DB ↔ Stripe mapping (pure).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  evaluateDbStripeMapping,
  normalizeSuffixTail,
  suffixTailMatch,
} from '../tools/stagingOperatorL11StripeMapping.mjs';
import { idSuffix } from '../tools/stagingOperatorL11Refund.mjs';

const orderId = 'cmp95a2kc0003jy04pvq0dr78';
const piId = 'pi_test_8G1gSpd5PB';

describe('suffixTailMatch', () => {
  it('matches idSuffix ellipsis tail to safeSuffix API tail', () => {
    assert.equal(suffixTailMatch(idSuffix(piId), '8G1gSpd5PB'), true);
    assert.equal(suffixTailMatch('8G1gSpd5PB', idSuffix(piId)), true);
    assert.equal(normalizeSuffixTail(idSuffix(piId)), '8G1gSpd5PB');
  });
});

describe('evaluateDbStripeMapping', () => {
  it('passes hosted checkout when metadata is on session only', () => {
    const pi = {
      id: piId,
      amount: 515,
      currency: 'usd',
      livemode: false,
      metadata: {},
      latest_charge: { id: 'ch_test_abc1234567' },
    };
    const session = {
      id: 'cs_test_session_01',
      client_reference_id: orderId,
      metadata: { internalCheckoutId: orderId },
    };
    const m = evaluateDbStripeMapping({
      pi,
      orderId,
      expectedPiSuffix: '8G1gSpd5PB',
      paymentIntentIdForVerify: piId,
      checkoutSession: session,
    });
    assert.equal(m.suffixMatch, true);
    assert.equal(m.hostedCheckoutLinkage, true);
    assert.equal(m.linkageOk, true);
    assert.equal(m.rootCauseCode, 'ok');
    assert.equal(m.piInternalMatch, false);
    assert.equal(m.sessionInternalMatch, true);
  });

  it('fails when PI metadata and session both missing order id', () => {
    const pi = {
      id: piId,
      metadata: { unrelated: 'x' },
      latest_charge: { id: 'ch_x' },
    };
    const m = evaluateDbStripeMapping({
      pi,
      orderId,
      expectedPiSuffix: '8G1gSpd5PB',
      paymentIntentIdForVerify: piId,
      checkoutSession: null,
    });
    assert.equal(m.linkageOk, false);
    assert.equal(m.rootCauseCode, 'stripe_order_metadata_mismatch');
  });
});
