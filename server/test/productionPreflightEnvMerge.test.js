import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  PRODUCTION_PREFLIGHT_SYNTHETIC_OWNER_EMAIL,
  buildProductionPreflightMergedEnv,
} from '../src/config/productionPreflightEnvMerge.js';
import { evaluateProductionDeploymentPreflight } from '../src/config/productionDeploymentPreflight.js';

const LIVE_BASE = {
  NODE_ENV: 'development',
  DATABASE_URL: 'postgresql://u:p@127.0.0.1:5432/db',
  STRIPE_SECRET_KEY: 'rk_test_' + '0'.repeat(52),
  STRIPE_WEBHOOK_SECRET: 'whsec_' + 'b'.repeat(32),
  CLIENT_URL: 'https://app.example.com',
  CORS_ORIGINS: 'https://app.example.com',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  ACCESS_TOKEN_TTL: '900',
  REFRESH_TOKEN_TTL: '604800',
  PRELAUNCH_LOCKDOWN: 'false',
  PAYMENTS_LOCKDOWN_MODE: 'false',
  ALLOW_STRIPE_TEST_KEYS_IN_PRODUCTION: 'true',
  AIRTIME_PROVIDER: 'mock',
  ALLOW_MOCK_AIRTIME_IN_PRODUCTION: 'true',
  WEBTOPUP_FULFILLMENT_PROVIDER: 'mock',
  ALLOW_MOCK_WEBTOPUP_FULFILLMENT_IN_PRODUCTION: 'true',
  ZW_REQUIRE_OWNER_ALLOWED_EMAIL: '',
  OWNER_ALLOWED_EMAIL: '',
};

test('synthetic owner merge satisfies production preflight owner gate (live money surface)', () => {
  const { env, syntheticOwnerGateApplied } = buildProductionPreflightMergedEnv({
    ...LIVE_BASE,
    ZW_PRODUCTION_PREFLIGHT_SYNTHETIC_OWNER_GATE: 'true',
  });
  assert.equal(syntheticOwnerGateApplied, true);
  assert.equal(env.OWNER_ALLOWED_EMAIL, PRODUCTION_PREFLIGHT_SYNTHETIC_OWNER_EMAIL);
  const r = evaluateProductionDeploymentPreflight(env);
  assert.equal(r.ok, true, r.blockers.join(' | '));
  assert.ok(!r.blockers.some((b) => b.includes('owner_gate')));
});

test('without synthetic flag, live money surface still requires owner', () => {
  const { env, syntheticOwnerGateApplied } = buildProductionPreflightMergedEnv(LIVE_BASE);
  assert.equal(syntheticOwnerGateApplied, false);
  const r = evaluateProductionDeploymentPreflight(env);
  assert.equal(r.ok, false);
  assert.ok(r.blockers.some((b) => b.includes('owner_gate')));
});
