import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getRedisDegradeCounters,
  recordRedisClientConnectFailure,
  recordRedisCommandFailure,
} from '../src/lib/redisDegradeSignals.js';

describe('redisDegradeSignals', () => {
  it('increments connect and command failure counters', () => {
    const b = getRedisDegradeCounters().clientConnectFailures;
    recordRedisClientConnectFailure();
    recordRedisCommandFailure();
    const a = getRedisDegradeCounters();
    assert.equal(a.clientConnectFailures, b + 1);
    assert.equal(a.commandFailures >= 1, true);
  });
});
