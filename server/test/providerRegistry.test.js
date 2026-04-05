import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isRegisteredTopupProvider,
  resolveTopupFulfillmentProvider,
} from '../src/services/topupFulfillment/providerRegistry.js';

describe('providerRegistry', () => {
  it('resolves mock', () => {
    const p = resolveTopupFulfillmentProvider('mock');
    assert.ok(p);
    assert.equal(p.id, 'mock');
  });

  it('resolves reloadly web top-up adapter', () => {
    const p = resolveTopupFulfillmentProvider('reloadly');
    assert.ok(p);
    assert.equal(p.id, 'reloadly');
  });

  it('returns null for unknown', () => {
    assert.equal(resolveTopupFulfillmentProvider('ding'), null);
    assert.equal(isRegisteredTopupProvider('ding'), false);
  });
});
