import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { assertProviderMatchesWebTopupScope } from '../src/services/topupFulfillment/webTopupFulfillmentScope.js';

describe('assertProviderMatchesWebTopupScope', () => {
  it('allows mock for any route', () => {
    assert.equal(
      assertProviderMatchesWebTopupScope('mock', {
        destinationCountry: 'PK',
        productType: 'airtime',
      }).ok,
      true,
    );
  });

  it('allows reloadly only for AF airtime', () => {
    assert.equal(
      assertProviderMatchesWebTopupScope('reloadly', {
        destinationCountry: 'AF',
        productType: 'airtime',
      }).ok,
      true,
    );
    assert.equal(
      assertProviderMatchesWebTopupScope('reloadly', {
        destinationCountry: 'PK',
        productType: 'airtime',
      }).ok,
      false,
    );
    assert.equal(
      assertProviderMatchesWebTopupScope('reloadly', {
        destinationCountry: 'AF',
        productType: 'data',
      }).ok,
      false,
    );
  });
});
