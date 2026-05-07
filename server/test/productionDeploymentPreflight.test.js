import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { evaluateProductionDeploymentPreflight } from '../src/config/productionDeploymentPreflight.js';

const BASE = {
  NODE_ENV: 'development',
  DATABASE_URL: 'postgresql://u:p@127.0.0.1:5432/db',
  // Synthetic: `effectiveStripeSecretKey` requires length >= 60. Use `rk_test_` (not `sk_live_` /
  // `sk_test_`) so GitHub push protection does not treat the fixture as a pasted Stripe secret.
  STRIPE_SECRET_KEY: 'rk_test_' + 'a'.repeat(52),
  STRIPE_WEBHOOK_SECRET: 'whsec_' + 'b'.repeat(12),
  CLIENT_URL: 'https://app.example.com',
  CORS_ORIGINS: 'https://app.example.com',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  ACCESS_TOKEN_TTL: '900',
  REFRESH_TOKEN_TTL: '604800',
  PRELAUNCH_LOCKDOWN: 'true',
  PAYMENTS_LOCKDOWN_MODE: 'true',
  AIRTIME_PROVIDER: 'mock',
  ALLOW_MOCK_AIRTIME_IN_PRODUCTION: 'true',
  WEBTOPUP_FULFILLMENT_PROVIDER: 'mock',
  ALLOW_MOCK_WEBTOPUP_FULFILLMENT_IN_PRODUCTION: 'true',
};

describe('productionDeploymentPreflight', () => {
  test('passes with lockdown + mock airtime allowlist + webhook + postgres', () => {
    const r = evaluateProductionDeploymentPreflight(BASE);
    assert.equal(r.ok, true, r.blockers.join(' | '));
  });

  test('fails when STRIPE_WEBHOOK_SECRET missing', () => {
    const r = evaluateProductionDeploymentPreflight({
      ...BASE,
      STRIPE_WEBHOOK_SECRET: '',
    });
    assert.equal(r.ok, false);
    assert.ok(r.blockers.some((b) => b.includes('stripe_webhook_secret')));
  });

  test('fails live money surface without owner gates', () => {
    const r = evaluateProductionDeploymentPreflight({
      ...BASE,
      PRELAUNCH_LOCKDOWN: 'false',
      PAYMENTS_LOCKDOWN_MODE: 'false',
      ZW_REQUIRE_OWNER_ALLOWED_EMAIL: '',
      OWNER_ALLOWED_EMAIL: '',
    });
    assert.equal(r.ok, false);
    assert.ok(r.blockers.some((b) => b.includes('owner_gate')));
  });

  test('fails live money surface with test Stripe key', () => {
    const r = evaluateProductionDeploymentPreflight({
      ...BASE,
      PRELAUNCH_LOCKDOWN: 'false',
      PAYMENTS_LOCKDOWN_MODE: 'false',
      ZW_REQUIRE_OWNER_ALLOWED_EMAIL: 'true',
      OWNER_ALLOWED_EMAIL: 'ops@example.com',
      STRIPE_SECRET_KEY: 'rk_test_' + '0'.repeat(52),
    });
    assert.equal(r.ok, false);
    assert.ok(r.blockers.some((b) => b.includes('stripe_key_mode')));
  });

  test('allows test Stripe key when explicitly flagged (staging)', () => {
    const r = evaluateProductionDeploymentPreflight({
      ...BASE,
      PRELAUNCH_LOCKDOWN: 'false',
      PAYMENTS_LOCKDOWN_MODE: 'false',
      ZW_REQUIRE_OWNER_ALLOWED_EMAIL: 'true',
      OWNER_ALLOWED_EMAIL: 'ops@example.com',
      STRIPE_SECRET_KEY: 'rk_test_' + '0'.repeat(52),
      ALLOW_STRIPE_TEST_KEYS_IN_PRODUCTION: 'true',
    });
    assert.equal(r.ok, true, r.blockers.join(' | '));
  });

  test('fails unsafe CORS wildcard', () => {
    const r = evaluateProductionDeploymentPreflight({
      ...BASE,
      CORS_ORIGINS: 'https://a.com,*',
    });
    assert.equal(r.ok, false);
    assert.ok(r.blockers.some((b) => b.includes('cors')));
  });

  test('fails ZW_ALLOW_LOCAL_FLUTTER_WEB_CORS in production profile', () => {
    const r = evaluateProductionDeploymentPreflight({
      ...BASE,
      ZW_ALLOW_LOCAL_FLUTTER_WEB_CORS: 'true',
    });
    assert.equal(r.ok, false);
    assert.ok(r.blockers.some((b) => b.includes('ZW_ALLOW_LOCAL_FLUTTER_WEB_CORS')));
  });

  test('fails DEV_CHECKOUT_AUTH_BYPASS for production profile', () => {
    const r = evaluateProductionDeploymentPreflight({
      ...BASE,
      DEV_CHECKOUT_AUTH_BYPASS: 'true',
    });
    assert.equal(r.ok, false);
    assert.ok(
      r.blockers.some(
        (b) =>
          b.includes('dev_bypass') ||
          b.includes('dev_checkout_bypass_in_production'),
      ),
    );
  });

  test('fails Reloadly live outbound without map + approval', () => {
    const r = evaluateProductionDeploymentPreflight({
      ...BASE,
      PRELAUNCH_LOCKDOWN: 'false',
      PAYMENTS_LOCKDOWN_MODE: 'false',
      ZW_REQUIRE_OWNER_ALLOWED_EMAIL: 'true',
      OWNER_ALLOWED_EMAIL: 'ops@example.com',
      AIRTIME_PROVIDER: 'reloadly',
      ALLOW_MOCK_AIRTIME_IN_PRODUCTION: 'true',
      PHASE1_FULFILLMENT_OUTBOUND_ENABLED: 'true',
      RELOADLY_SANDBOX: 'false',
      RELOADLY_OPERATOR_MAP_JSON: '',
    });
    assert.equal(r.ok, false);
    assert.ok(r.blockers.some((b) => b.includes('reloadly')));
  });

  test('passes Reloadly live outbound with real operator id in JSON', () => {
    const r = evaluateProductionDeploymentPreflight({
      ...BASE,
      PRELAUNCH_LOCKDOWN: 'false',
      PAYMENTS_LOCKDOWN_MODE: 'false',
      ZW_REQUIRE_OWNER_ALLOWED_EMAIL: 'true',
      OWNER_ALLOWED_EMAIL: 'ops@example.com',
      /** Live-money surface requires live-mode secret; use `rk_live_` + 52 chars (len 60, under material regex {56,} suffix). */
      STRIPE_SECRET_KEY: 'rk_live_' + 'a'.repeat(52),
      AIRTIME_PROVIDER: 'reloadly',
      ALLOW_MOCK_AIRTIME_IN_PRODUCTION: 'true',
      PHASE1_FULFILLMENT_OUTBOUND_ENABLED: 'true',
      RELOADLY_SANDBOX: 'false',
      RELOADLY_OPERATOR_MAP_JSON: JSON.stringify({ mtn: '12345678' }),
    });
    assert.equal(r.ok, true, r.blockers.join(' | '));
  });

  test('fails Reloadly live outbound with placeholder-only map and no approval flag', () => {
    const r = evaluateProductionDeploymentPreflight({
      ...BASE,
      PRELAUNCH_LOCKDOWN: 'false',
      PAYMENTS_LOCKDOWN_MODE: 'false',
      ZW_REQUIRE_OWNER_ALLOWED_EMAIL: 'true',
      OWNER_ALLOWED_EMAIL: 'ops@example.com',
      AIRTIME_PROVIDER: 'reloadly',
      ALLOW_MOCK_AIRTIME_IN_PRODUCTION: 'true',
      PHASE1_FULFILLMENT_OUTBOUND_ENABLED: 'true',
      RELOADLY_SANDBOX: 'false',
      RELOADLY_OPERATOR_MAP_JSON: JSON.stringify({ mtn: '911001' }),
    });
    assert.equal(r.ok, false);
    assert.ok(r.blockers.some((b) => b.includes('reloadly')));
  });
});
