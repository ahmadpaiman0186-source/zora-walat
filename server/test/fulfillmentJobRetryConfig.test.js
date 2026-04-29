import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEFAULT_FULFILLMENT_JOB_RETRY_DELAYS_MS,
  parseFulfillmentJobRetryDelaysMsFromEnv,
} from '../src/config/fulfillmentJobRetryConfig.js';

describe('fulfillmentJobRetryConfig', () => {
  it('defaults to 5s, 30s, 2m', () => {
    assert.deepEqual([...DEFAULT_FULFILLMENT_JOB_RETRY_DELAYS_MS], [
      5000, 30_000, 120_000,
    ]);
    const d = parseFulfillmentJobRetryDelaysMsFromEnv(undefined);
    assert.deepEqual([...d], [5000, 30_000, 120_000]);
  });

  it('parses comma-separated positive delays', () => {
    const d = parseFulfillmentJobRetryDelaysMsFromEnv('1000, 2000, 4000');
    assert.deepEqual([...d], [1000, 2000, 4000]);
  });

  it('falls back to defaults when all parts invalid', () => {
    const d = parseFulfillmentJobRetryDelaysMsFromEnv('x,y,z');
    assert.deepEqual([...d], [5000, 30_000, 120_000]);
  });
});
