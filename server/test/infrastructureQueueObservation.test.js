import assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach } from 'node:test';

import { env } from '../src/config/env.js';
import { getPhase1FulfillmentQueueObservation } from '../src/lib/phase1FulfillmentQueueObservation.js';

describe('getPhase1FulfillmentQueueObservation', () => {
  const origRedis = process.env.REDIS_URL;
  const origEnvRedis = env.redisUrl;

  beforeEach(() => {
    delete process.env.REDIS_URL;
    env.redisUrl = '';
  });

  afterEach(() => {
    if (origRedis !== undefined) process.env.REDIS_URL = origRedis;
    else delete process.env.REDIS_URL;
    env.redisUrl = origEnvRedis;
  });

  it('returns unavailable when Redis URL is not configured', async () => {
    const r = await getPhase1FulfillmentQueueObservation();
    assert.equal(r.available, false);
    assert.equal(r.reason, 'redis_url_unset');
  });
});
