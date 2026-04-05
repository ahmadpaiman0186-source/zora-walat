import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ReloadlyWebTopupProvider } from '../src/services/topupFulfillment/providers/reloadlyWebTopupProvider.js';

const req = {
  orderId: 'tw_ord_aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  destinationCountry: 'AF',
  productType: 'airtime',
  operatorKey: 'roshan',
  operatorLabel: 'Roshan',
  phoneNationalDigits: '701234567',
  productId: 'p1',
  productName: 'Test',
  amountCents: 500,
  currency: 'usd',
};

describe('ReloadlyWebTopupProvider (HTTP boundary mocked)', () => {
  it('returns normalized success when sendTopup succeeds', async () => {
    const p = new ReloadlyWebTopupProvider({
      getToken: async () => ({ ok: true, accessToken: 't' }),
      sendTopup: async () => ({
        ok: true,
        providerReference: 'reloadly_tx_42',
      }),
      operatorMap: () => ({ roshan: '100' }),
    });
    const r = await p.sendTopup(req);
    assert.equal(r.outcome, 'succeeded');
    if (r.outcome === 'succeeded') {
      assert.equal(r.providerReference, 'reloadly_tx_42');
    }
  });

  it('maps token failure without calling sendTopup', async () => {
    let called = false;
    const p = new ReloadlyWebTopupProvider({
      getToken: async () => ({
        ok: false,
        failureCode: 'reloadly_auth_rejected',
      }),
      sendTopup: async () => {
        called = true;
        return { ok: true, providerReference: 'x' };
      },
      operatorMap: () => ({ roshan: '100' }),
    });
    const r = await p.sendTopup(req);
    assert.equal(called, false);
    assert.equal(r.outcome, 'failed_terminal');
  });

  it('returns unsupported_route when build rejects country', async () => {
    const p = new ReloadlyWebTopupProvider({
      getToken: async () => ({ ok: true, accessToken: 't' }),
      sendTopup: async () => ({ ok: true, providerReference: 'x' }),
      operatorMap: () => ({ roshan: '100' }),
    });
    const r = await p.sendTopup({ ...req, destinationCountry: 'US' });
    assert.equal(r.outcome, 'unsupported_route');
  });

  it('declares AF + airtime capabilities only', () => {
    const p = new ReloadlyWebTopupProvider({
      getToken: async () => ({ ok: true, accessToken: 't' }),
      sendTopup: async () => ({ ok: true, providerReference: 'x' }),
      operatorMap: () => ({}),
    });
    const c = p.getCapabilities();
    assert.deepEqual(c.destinationCountries, ['AF']);
    assert.deepEqual(c.productTypes, ['airtime']);
    assert.equal(c.operatorsWildcard, false);
  });
});
