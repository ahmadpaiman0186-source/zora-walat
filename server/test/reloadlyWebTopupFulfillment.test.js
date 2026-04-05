import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildWebTopupReloadlyPayload,
  mapReloadlyTokenFailureToFulfillmentResult,
  mapReloadlyTopupFailureToFulfillmentResult,
  mapReloadlyWebTopupBuildFailureToFulfillmentResult,
  mapReloadlyTopupSendResultToFulfillmentResult,
} from '../src/domain/fulfillment/reloadlyWebTopupFulfillment.js';

const afAirtimeReq = {
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

describe('buildWebTopupReloadlyPayload', () => {
  it('rejects non-AF destination', () => {
    const r = buildWebTopupReloadlyPayload(
      { ...afAirtimeReq, destinationCountry: 'PK' },
      { roshan: '123' },
    );
    assert.equal(r.ok, false);
    if (!r.ok) assert.ok(r.code.includes('country'));
  });

  it('rejects data product', () => {
    const r = buildWebTopupReloadlyPayload(
      { ...afAirtimeReq, productType: 'data' },
      { roshan: '123' },
    );
    assert.equal(r.ok, false);
  });

  it('builds body for AF airtime with operator map', () => {
    const r = buildWebTopupReloadlyPayload(afAirtimeReq, { roshan: '999' });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.body.operatorId, '999');
      assert.equal(r.body.recipientPhone.countryCode, 'AF');
      assert.ok(String(r.body.recipientPhone.number).startsWith('93'));
    }
  });
});

describe('mapReloadlyTokenFailureToFulfillmentResult', () => {
  it('maps auth rejected to terminal', () => {
    const m = mapReloadlyTokenFailureToFulfillmentResult({
      ok: false,
      failureCode: 'reloadly_auth_rejected',
    });
    assert.equal(m.outcome, 'failed_terminal');
    assert.equal(m.errorCode, 'auth_failure');
  });

  it('maps auth timeout to retryable', () => {
    const m = mapReloadlyTokenFailureToFulfillmentResult({
      ok: false,
      failureCode: 'reloadly_auth_timeout',
    });
    assert.equal(m.outcome, 'failed_retryable');
  });
});

describe('mapReloadlyTopupFailureToFulfillmentResult', () => {
  it('maps rate limit to retryable', () => {
    const m = mapReloadlyTopupFailureToFulfillmentResult({
      failureCode: 'reloadly_topup_rate_limited',
      failureMessage: 'Slow down',
    });
    assert.equal(m.outcome, 'failed_retryable');
  });

  it('maps bad request with amount hint to amount mismatch', () => {
    const m = mapReloadlyTopupFailureToFulfillmentResult({
      failureCode: 'reloadly_topup_bad_request',
      failureMessage: 'Amount not valid for product',
    });
    assert.equal(m.outcome, 'invalid_request');
    assert.equal(m.errorCode, 'AMOUNT_MISMATCH');
  });
});

describe('mapReloadlyWebTopupBuildFailureToFulfillmentResult', () => {
  it('maps country rollout to unsupported_route', () => {
    const m = mapReloadlyWebTopupBuildFailureToFulfillmentResult({
      ok: false,
      code: 'reloadly_webtopup_country_not_enabled',
      message: 'PK not enabled',
    });
    assert.equal(m.outcome, 'unsupported_route');
  });
});

describe('mapReloadlyTopupSendResultToFulfillmentResult', () => {
  it('maps success', () => {
    const m = mapReloadlyTopupSendResultToFulfillmentResult({
      ok: true,
      providerReference: 'reloadly_tx_1',
    });
    assert.equal(m.outcome, 'succeeded');
  });
});
