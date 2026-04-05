import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getWebTopupMetricsSnapshot,
  safeSuffix,
  sessionKeySuffix,
} from '../src/lib/webTopupObservability.js';

describe('webTopupObservability', () => {
  it('safeSuffix truncates long ids', () => {
    assert.equal(safeSuffix('pi_abcdefghijklmnop', 6), 'klmnop');
  });

  it('sessionKeySuffix is short', () => {
    const sk = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    assert.equal(sessionKeySuffix(sk), sk.slice(-4));
  });

  it('getWebTopupMetricsSnapshot includes collectedAt', () => {
    const s = getWebTopupMetricsSnapshot();
    assert.ok(typeof s.collectedAt === 'string');
  });
});
