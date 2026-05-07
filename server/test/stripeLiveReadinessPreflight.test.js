import { test } from 'node:test';
import assert from 'node:assert/strict';

import { evaluateStripeLiveReadinessPreflight } from '../src/config/stripeLiveReadinessPreflight.js';

const whsecOk = `whsec_${'a'.repeat(32)}`;
const skTest = `rk_test_${'b'.repeat(100)}`;
/** Restricted live shape; suffix kept to 52 chars so `rk_live_[A-Za-z0-9]{56,}` repo scans do not fire. */
const skLive = `rk_live_${'c'.repeat(52)}`;
const pkLive = `pk_live_${'e'.repeat(52)}`;

function baseEnv(over = {}) {
  return {
    NODE_ENV: 'development',
    STRIPE_SECRET_KEY: skTest,
    STRIPE_WEBHOOK_SECRET: whsecOk,
    PRELAUNCH_LOCKDOWN: 'false',
    PAYMENTS_LOCKDOWN_MODE: 'false',
    ...over,
  };
}

test('passes for typical test-mode dev env (no prod intent)', () => {
  const r = evaluateStripeLiveReadinessPreflight(baseEnv(), {});
  assert.equal(r.ok, true);
  assert.equal(r.checks.secretKeyMode, 'test');
  assert.equal(r.checks.prodIntentEvaluated, false);
});

test('blocks live secret without ack on non-production NODE_ENV', () => {
  const r = evaluateStripeLiveReadinessPreflight(
    baseEnv({ STRIPE_SECRET_KEY: skLive }),
    {},
  );
  assert.equal(r.ok, false);
  assert.ok(r.blockers.some((b) => b.includes('stripe_live_secret_guard')));
});

test('allows live secret on non-production when ack is set', () => {
  const r = evaluateStripeLiveReadinessPreflight(
    baseEnv({
      STRIPE_SECRET_KEY: skLive,
      ZW_STRIPE_LIVE_READINESS_ACK_LIVE_SECRET: 'true',
      STRIPE_PUBLISHABLE_KEY: pkLive,
    }),
    {},
  );
  assert.ok(!r.blockers.some((b) => b.includes('stripe_live_secret_guard')));
  assert.equal(r.checks.publishableMatchesSecret, true);
});

test('blocks publishable mode mismatch', () => {
  const r = evaluateStripeLiveReadinessPreflight(
    baseEnv({ STRIPE_PUBLISHABLE_KEY: pkLive }),
    {},
  );
  assert.equal(r.ok, false);
  assert.ok(r.blockers.some((b) => b.includes('stripe_key_mode_alignment')));
});

test('prod intent warns when ALLOW_STRIPE_TEST_KEYS_IN_PRODUCTION with test keys (staging)', () => {
  const r = evaluateStripeLiveReadinessPreflight(
    baseEnv({
      ZW_STRIPE_LIVE_PREFLIGHT_PROD_INTENT: 'true',
      ALLOW_STRIPE_TEST_KEYS_IN_PRODUCTION: 'true',
      AIRTIME_PROVIDER: 'reloadly',
      WEBTOPUP_FULFILLMENT_PROVIDER: 'reloadly',
      RELOADLY_ALLOW_UNAVAILABLE_MOCK_FALLBACK: 'false',
    }),
    {},
  );
  assert.equal(r.ok, true);
  assert.ok(r.warnings.some((w) => w.includes('stripe_activation')));
});

test('prod intent blocks ALLOW_STRIPE_TEST_KEYS_IN_PRODUCTION with live secret', () => {
  const r = evaluateStripeLiveReadinessPreflight(
    baseEnv({
      ZW_STRIPE_LIVE_PREFLIGHT_PROD_INTENT: 'true',
      STRIPE_SECRET_KEY: skLive,
      STRIPE_PUBLISHABLE_KEY: pkLive,
      ZW_STRIPE_LIVE_READINESS_ACK_LIVE_SECRET: 'true',
      ALLOW_STRIPE_TEST_KEYS_IN_PRODUCTION: 'true',
      AIRTIME_PROVIDER: 'reloadly',
      WEBTOPUP_FULFILLMENT_PROVIDER: 'reloadly',
      RELOADLY_ALLOW_UNAVAILABLE_MOCK_FALLBACK: 'false',
    }),
    {},
  );
  assert.equal(r.ok, false);
  assert.ok(r.blockers.some((b) => b.includes('stripe_allow_test_keys')));
});

test('prod intent requires live keys or supervised test-key flag when money path live', () => {
  const r = evaluateStripeLiveReadinessPreflight(
    baseEnv({
      ZW_STRIPE_LIVE_PREFLIGHT_PROD_INTENT: 'true',
      STRIPE_SECRET_KEY: skTest,
      ALLOW_STRIPE_TEST_KEYS_IN_PRODUCTION: 'false',
      AIRTIME_PROVIDER: 'reloadly',
      ALLOW_MOCK_AIRTIME_IN_PRODUCTION: 'true',
      WEBTOPUP_FULFILLMENT_PROVIDER: 'reloadly',
      ALLOW_MOCK_WEBTOPUP_FULFILLMENT_IN_PRODUCTION: 'true',
    }),
    {},
  );
  assert.equal(r.ok, false);
  assert.ok(r.blockers.some((b) => b.includes('stripe_key_mode')));
});

test('blocks unset PRELAUNCH_LOCKDOWN (must be explicit)', () => {
  const e = baseEnv();
  delete e.PRELAUNCH_LOCKDOWN;
  const r = evaluateStripeLiveReadinessPreflight(e, {});
  assert.equal(r.ok, false);
  assert.ok(r.blockers.some((b) => b.includes('PRELAUNCH_LOCKDOWN')));
});
