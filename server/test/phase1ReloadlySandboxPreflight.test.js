import assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach } from 'node:test';

import { ORDER_STATUS } from '../src/constants/orderStatus.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../src/constants/fulfillmentAttemptStatus.js';
import {
  collectPhase1ReloadlySandboxBlockers,
  getPhase1ReloadlySandboxEnvGate,
  phase1SandboxDispatchNextAction,
} from '../src/lib/phase1ReloadlySandboxPreflight.js';

describe('phase1ReloadlySandboxPreflight', () => {
  const prevAirtime = process.env.AIRTIME_PROVIDER;

  beforeEach(() => {
    process.env.AIRTIME_PROVIDER = 'reloadly';
  });

  afterEach(() => {
    if (prevAirtime != null) process.env.AIRTIME_PROVIDER = prevAirtime;
    else delete process.env.AIRTIME_PROVIDER;
  });

  it('collectPhase1ReloadlySandboxBlockers requires PAID + QUEUED attempt', () => {
    const order = {
      id: 'o1',
      operatorKey: 'roshan',
      orderStatus: ORDER_STATUS.PROCESSING,
    };
    const queued = { id: 'a1', status: FULFILLMENT_ATTEMPT_STATUS.QUEUED };
    const b = collectPhase1ReloadlySandboxBlockers(order, queued);
    assert.ok(b.some((x) => x.includes('PAID')));
  });

  it('phase1SandboxDispatchNextAction distinguishes ready vs blocked', () => {
    assert.ok(phase1SandboxDispatchNextAction(true).includes('--execute'));
    assert.ok(phase1SandboxDispatchNextAction(false).includes('Fix blockers'));
  });

  it('getPhase1ReloadlySandboxEnvGate exposes boolean flags', () => {
    const g = getPhase1ReloadlySandboxEnvGate();
    assert.equal(typeof g.airtimeProviderReloadly, 'boolean');
    assert.equal(typeof g.reloadlySandbox, 'boolean');
    assert.equal(typeof g.reloadlyCredentialsConfigured, 'boolean');
  });
});
