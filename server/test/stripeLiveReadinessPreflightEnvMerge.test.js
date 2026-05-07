import assert from 'node:assert/strict';
import { test } from 'node:test';

import { evaluateStripeLiveReadinessPreflight } from '../src/config/stripeLiveReadinessPreflight.js';
import { buildStripeLiveReadinessPreflightMergedEnv } from '../src/config/stripeLiveReadinessPreflightEnvMerge.js';

const whsecOk = `whsec_${'a'.repeat(32)}`;
const skTest = `rk_test_${'b'.repeat(100)}`;
const pkTest = `pk_test_${'c'.repeat(90)}`;

test('merge repairs broken dev env for test secret (in-memory preflight only)', () => {
  const bad = {
    NODE_ENV: 'development',
    STRIPE_SECRET_KEY: skTest,
    STRIPE_WEBHOOK_SECRET: 'not_whsec',
    PRELAUNCH_LOCKDOWN: 'false',
    // PAYMENTS unset — blocker without merge
    STRIPE_PUBLISHABLE_KEY: 'invalid_pub_key',
  };
  const { env } = buildStripeLiveReadinessPreflightMergedEnv(bad, { serverRoot: '' });
  const r = evaluateStripeLiveReadinessPreflight(env, {});
  assert.equal(r.ok, true);
  assert.equal(r.checks.webhookSecretWhsecPrefix, true);
  assert.equal(r.checks.publishableKeyMode, 'test');
  assert.equal(r.checks.paymentsLockdownExplicit, true);
});

test('merge opt-out with ZW_STRIPE_LIVE_READINESS_SIMULATION_MERGE=false', () => {
  const raw = {
    NODE_ENV: 'development',
    STRIPE_SECRET_KEY: skTest,
    STRIPE_WEBHOOK_SECRET: 'x',
    PRELAUNCH_LOCKDOWN: 'false',
    PAYMENTS_LOCKDOWN_MODE: 'false',
    STRIPE_PUBLISHABLE_KEY: pkTest,
    ZW_STRIPE_LIVE_READINESS_SIMULATION_MERGE: 'false',
  };
  const { env } = buildStripeLiveReadinessPreflightMergedEnv(raw, { serverRoot: '' });
  const r = evaluateStripeLiveReadinessPreflight(env, {});
  assert.equal(r.ok, false);
  assert.ok(r.blockers.some((b) => b.includes('stripe_webhook_secret')));
});

test('merge does not inject synthetic whsec for rk_live without fixing invalid webhook', () => {
  const skLive = `rk_live_${'d'.repeat(52)}`;
  const merged = buildStripeLiveReadinessPreflightMergedEnv(
    {
      NODE_ENV: 'production',
      STRIPE_SECRET_KEY: skLive,
      STRIPE_WEBHOOK_SECRET: 'bad',
      PRELAUNCH_LOCKDOWN: 'false',
      PAYMENTS_LOCKDOWN_MODE: 'false',
      STRIPE_PUBLISHABLE_KEY: `pk_live_${'e'.repeat(52)}`,
      ZW_STRIPE_LIVE_READINESS_ACK_LIVE_SECRET: 'true',
    },
    { serverRoot: '' },
  );
  assert.equal(
    String(merged.env.STRIPE_WEBHOOK_SECRET ?? '').startsWith('whsec_'),
    false,
  );
});
