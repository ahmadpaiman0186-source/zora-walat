import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { validateWebTopupFulfillmentProviderConfigFrom } from '../src/config/webTopupFulfillmentStartup.js';

describe('validateWebTopupFulfillmentProviderConfigFrom', () => {
  it('allows mock', () => {
    const r = validateWebTopupFulfillmentProviderConfigFrom('mock', () => false);
    assert.equal(r.ok, true);
  });

  it('fails reloadly when credentials missing', () => {
    const r = validateWebTopupFulfillmentProviderConfigFrom('reloadly', () => false);
    assert.equal(r.ok, false);
    if (!r.ok) assert.ok(r.message.includes('RELOADLY'));
  });

  it('passes reloadly when credentials reported present', () => {
    const r = validateWebTopupFulfillmentProviderConfigFrom('reloadly', () => true);
    assert.equal(r.ok, true);
  });
});
