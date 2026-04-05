import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { MockTopupProvider, resolveMockScenario } from '../src/services/topupFulfillment/providers/mockTopupProvider.js';

const baseReq = {
  orderId: 'tw_ord_aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  destinationCountry: 'AF',
  productType: 'airtime',
  operatorKey: 'roshan',
  operatorLabel: 'Roshan',
  phoneNationalDigits: '93701234567',
  productId: 'p1',
  productName: 'Test',
  amountCents: 500,
  currency: 'usd',
};

describe('resolveMockScenario', () => {
  it('uses mock: prefix when present', () => {
    assert.equal(
      resolveMockScenario({ ...baseReq, operatorKey: 'mock:retry' }),
      'retry',
    );
    assert.equal(
      resolveMockScenario({ ...baseReq, operatorKey: 'mock:terminal' }),
      'terminal',
    );
  });

  it('uses phone suffix when no prefix', () => {
    assert.equal(resolveMockScenario({ ...baseReq, phoneNationalDigits: '93701234590' }), 'retry');
    assert.equal(resolveMockScenario({ ...baseReq, phoneNationalDigits: '93701234591' }), 'terminal');
    assert.equal(
      resolveMockScenario({ ...baseReq, phoneNationalDigits: '93701234592' }),
      'unsupported',
    );
  });
});

describe('MockTopupProvider', () => {
  const p = new MockTopupProvider();

  it('returns success outcome by default', async () => {
    const r = await p.sendTopup(baseReq);
    assert.equal(r.outcome, 'succeeded');
    assert.ok(r.providerReference?.startsWith('mock_'));
  });

  it('simulates retryable failure', async () => {
    const r = await p.sendTopup({
      ...baseReq,
      operatorKey: 'mock:retry',
    });
    assert.equal(r.outcome, 'failed_retryable');
    assert.ok(r.errorCode);
  });

  it('simulates terminal failure', async () => {
    const r = await p.sendTopup({
      ...baseReq,
      operatorKey: 'mock:terminal',
    });
    assert.equal(r.outcome, 'failed_terminal');
  });

  it('simulates unsupported route', async () => {
    const r = await p.sendTopup({
      ...baseReq,
      operatorKey: 'mock:unsupported',
    });
    assert.equal(r.outcome, 'unsupported_route');
  });

  it('simulates invalid product', async () => {
    const r = await p.sendTopup({
      ...baseReq,
      operatorKey: 'mock:invalid_product',
    });
    assert.equal(r.outcome, 'invalid_request');
  });

  it('simulates amount mismatch', async () => {
    const r = await p.sendTopup({
      ...baseReq,
      operatorKey: 'mock:amount_mismatch',
    });
    assert.equal(r.outcome, 'invalid_request');
    assert.equal(r.errorCode, 'AMOUNT_MISMATCH');
  });
});
