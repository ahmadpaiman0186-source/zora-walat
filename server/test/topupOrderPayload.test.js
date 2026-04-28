import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { computeTopupOrderPayloadHash } from '../src/lib/topupOrderPayload.js';

const base = {
  sessionKey: 'a0000000-0000-4000-8000-000000000001',
  originCountry: 'us',
  destinationCountry: 'af',
  productType: 'airtime',
  operatorKey: 'x',
  operatorLabel: 'Op',
  phoneNumber: '70123456789',
  productId: 'p',
  productName: 'P',
  selectedAmountLabel: '$5',
  amountCents: 500,
  currency: 'usd',
};

describe('computeTopupOrderPayloadHash', () => {
  it('differs when boundUserId presence changes (idempotency scope)', () => {
    const anon = computeTopupOrderPayloadHash({ ...base, boundUserId: null });
    const bound = computeTopupOrderPayloadHash({
      ...base,
      boundUserId: 'usr_test_binding',
    });
    assert.notEqual(anon, bound);
  });

  it('is stable for identical inputs', () => {
    const a = computeTopupOrderPayloadHash({ ...base, boundUserId: null });
    const b = computeTopupOrderPayloadHash({ ...base, boundUserId: null });
    assert.equal(a, b);
  });
});
