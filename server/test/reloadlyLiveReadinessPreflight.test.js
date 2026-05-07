import { test } from 'node:test';
import assert from 'node:assert/strict';

import { evaluateReloadlyLiveReadinessPreflight } from '../src/config/reloadlyLiveReadinessPreflight.js';

const credId = `reloadly_ci_${'i'.repeat(24)}`;
const credSec = `reloadly_cs_${'s'.repeat(24)}`;

function reloadlyBase(over = {}) {
  return {
    AIRTIME_PROVIDER: 'reloadly',
    RELOADLY_CLIENT_ID: credId,
    RELOADLY_CLIENT_SECRET: credSec,
    RELOADLY_SANDBOX: 'true',
    PHASE1_FULFILLMENT_OUTBOUND_ENABLED: 'false',
    RELOADLY_OPERATOR_MAP_JSON: '{}',
    ...over,
  };
}

test('passes with reloadly + sandbox + outbound off (defaults map)', () => {
  const r = evaluateReloadlyLiveReadinessPreflight(reloadlyBase());
  assert.equal(r.ok, true);
  assert.equal(r.checks.airtimeProviderReloadly, true);
  assert.equal(r.checks.reloadlySandboxMode, true);
  assert.equal(r.checks.phase1FulfillmentOutboundEnabled, false);
  assert.equal(r.checks.operatorResolutionAfghanistan.mtn.ok, true);
});

test('fails when AIRTIME_PROVIDER is not reloadly', () => {
  const r = evaluateReloadlyLiveReadinessPreflight(
    reloadlyBase({ AIRTIME_PROVIDER: 'mock' }),
  );
  assert.equal(r.ok, false);
  assert.ok(r.blockers.some((b) => b.includes('reloadly_airtime_provider')));
});

test('fails when RELOADLY_SANDBOX is unset', () => {
  const e = reloadlyBase();
  delete e.RELOADLY_SANDBOX;
  const r = evaluateReloadlyLiveReadinessPreflight(e);
  assert.equal(r.ok, false);
  assert.ok(r.blockers.some((b) => b.includes('reloadly_sandbox')));
});

test('fails when PHASE1_FULFILLMENT_OUTBOUND_ENABLED is unset', () => {
  const e = reloadlyBase();
  delete e.PHASE1_FULFILLMENT_OUTBOUND_ENABLED;
  const r = evaluateReloadlyLiveReadinessPreflight(e);
  assert.equal(r.ok, false);
  assert.ok(r.blockers.some((b) => b.includes('reloadly_outbound')));
});

test('live outbound with placeholders and no approval is blocked', () => {
  const r = evaluateReloadlyLiveReadinessPreflight(
    reloadlyBase({
      RELOADLY_SANDBOX: 'false',
      PHASE1_FULFILLMENT_OUTBOUND_ENABLED: 'true',
      RELOADLY_OPERATOR_MAP_JSON: '{}',
    }),
  );
  assert.equal(r.ok, false);
  assert.ok(r.blockers.some((b) => b.includes('reloadly_live_outbound')));
});

test('live outbound with real numeric id in map passes without approval', () => {
  const r = evaluateReloadlyLiveReadinessPreflight(
    reloadlyBase({
      RELOADLY_SANDBOX: 'false',
      PHASE1_FULFILLMENT_OUTBOUND_ENABLED: 'true',
      RELOADLY_OPERATOR_MAP_JSON: JSON.stringify({ mtn: '535555' }),
    }),
  );
  assert.ok(!r.blockers.some((b) => b.includes('reloadly_live_outbound')));
});

test('live outbound with only placeholder ids allowed when PHASE1_RELOADLY_LIVE_OUTBOUND_APPROVED', () => {
  const r = evaluateReloadlyLiveReadinessPreflight(
    reloadlyBase({
      RELOADLY_SANDBOX: 'false',
      PHASE1_FULFILLMENT_OUTBOUND_ENABLED: 'true',
      RELOADLY_OPERATOR_MAP_JSON: '{}',
      PHASE1_RELOADLY_LIVE_OUTBOUND_APPROVED: 'true',
    }),
  );
  assert.ok(!r.blockers.some((b) => b.includes('reloadly_live_outbound')));
});

test('fails on invalid operator map JSON entry (non-numeric id)', () => {
  const r = evaluateReloadlyLiveReadinessPreflight(
    reloadlyBase({
      RELOADLY_OPERATOR_MAP_JSON: JSON.stringify({ mtn: 'not_a_number' }),
    }),
  );
  assert.equal(r.ok, false);
  assert.ok(r.blockers.some((b) => b.includes('reloadly_operator_map')));
});
