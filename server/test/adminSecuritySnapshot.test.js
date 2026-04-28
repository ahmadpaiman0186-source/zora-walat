import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { env } from '../src/config/env.js';
import {
  getWebtopupAdminMutationMaxPerWindow,
  getWebtopupAdminReadMaxPerWindow,
} from '../src/lib/adminSecuritySnapshot.js';

describe('adminSecuritySnapshot rate limit getters', () => {
  it('returns values frozen at startup from webtopConfig (matches env slice)', () => {
    assert.equal(getWebtopupAdminMutationMaxPerWindow(), env.webtopupAdminMutationMaxPer15m);
    assert.equal(getWebtopupAdminReadMaxPerWindow(), env.webtopupAdminReadMaxPer15m);
    assert.ok(Number.isFinite(env.webtopupAdminMutationMaxPer15m));
    assert.ok(Number.isFinite(env.webtopupAdminReadMaxPer15m));
  });

  it('under npm test, getters honor live WEBTOPUP_ADMIN_* for integration tests', () => {
    process.env.WEBTOPUP_ADMIN_MUTATION_MAX_PER_15M = '77';
    process.env.WEBTOPUP_ADMIN_READ_MAX_PER_15M = '88';
    try {
      assert.equal(getWebtopupAdminMutationMaxPerWindow(), 77);
      assert.equal(getWebtopupAdminReadMaxPerWindow(), 88);
    } finally {
      delete process.env.WEBTOPUP_ADMIN_MUTATION_MAX_PER_15M;
      delete process.env.WEBTOPUP_ADMIN_READ_MAX_PER_15M;
    }
  });
});
