/**
 * Redis rate-limit init is skipped in NODE_ENV=test; stores must stay unset unless booted via API entry.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  rateLimitRedisStore,
  getHttpRateLimitSnapshot,
} from '../src/lib/rateLimitRedisInit.js';

describe('rateLimitRedisInit (unit)', () => {
  it('rateLimitRedisStore returns undefined without API bootstrap connect', () => {
    assert.equal(rateLimitRedisStore('probe'), undefined);
  });

  it('getHttpRateLimitSnapshot is secret-free (no Redis URL in object)', () => {
    const s = getHttpRateLimitSnapshot();
    assert.ok(s && typeof s === 'object');
    assert.ok('effectiveHttpRateStore' in s);
    assert.ok('redisKeyPrefixPattern' in s);
    assert.ok(!JSON.stringify(s).includes('redis://'));
  });
});
