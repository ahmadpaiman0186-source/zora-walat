/**
 * L-11 Stripe key resolution (no secrets in output).
 */
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { loadOperatorDotenv } from '../tools/stagingOperatorAuthEnv.mjs';
import {
  classifyStripeSecretKeyMode,
  normalizeStripeSecretRaw,
  resolveL11OperatorStripeKey,
  stripeSecretRawWasQuoted,
} from '../tools/stagingOperatorL11StripeKey.mjs';
import { resolveStripeSecretRaw } from '../src/config/stripeEnv.js';
import { stripeSecretKeyMode } from '../tools/stagingOperatorL11Refund.mjs';

const TEST_KEY = `sk_test_${'a'.repeat(60)}`;
const RESTRICTED_TEST_KEY = `rk_test_${'b'.repeat(60)}`;
const LIVE_KEY = `sk_live_${'c'.repeat(60)}`;

describe('classifyStripeSecretKeyMode', () => {
  it('classifies secret test key', () => {
    assert.equal(classifyStripeSecretKeyMode(TEST_KEY), 'test_secret');
  });

  it('classifies restricted test key', () => {
    assert.equal(classifyStripeSecretKeyMode(RESTRICTED_TEST_KEY), 'test_restricted');
  });

  it('blocks live key', () => {
    assert.equal(classifyStripeSecretKeyMode(LIVE_KEY), 'live_blocked');
  });

  it('blocks placeholder', () => {
    assert.equal(classifyStripeSecretKeyMode('sk_test_replace_me_key'), 'placeholder');
  });

  it('blocks truncated key', () => {
    assert.equal(classifyStripeSecretKeyMode('sk_test_short'), 'malformed');
  });

  it('normalizes quoted test key', () => {
    assert.equal(classifyStripeSecretKeyMode(`"${TEST_KEY}"`), 'test_secret');
    assert.equal(stripeSecretRawWasQuoted(`"${TEST_KEY}"`), true);
  });
});

describe('resolveL11OperatorStripeKey precedence', () => {
  it('.env.local overrides .env when shell has no key', () => {
    const root = mkdtempSync(join(tmpdir(), 'l11-key-'));
    writeFileSync(
      join(root, '.env'),
      `STRIPE_SECRET_KEY=${LIVE_KEY}\n`,
      'utf8',
    );
    writeFileSync(
      join(root, '.env.local'),
      `STRIPE_SECRET_KEY=${TEST_KEY}\n`,
      'utf8',
    );
    const res = resolveL11OperatorStripeKey({
      serverRoot: root,
      stripeKeyBeforeDotenv: undefined,
    });
    assert.equal(res.effectiveSource, 'env_local');
    assert.equal(res.keyMode, 'test_secret');
    assert.equal(res.effectiveKey, TEST_KEY);
  });

  it('process.env (shell) wins over .env.local', () => {
    const root = mkdtempSync(join(tmpdir(), 'l11-key-'));
    writeFileSync(join(root, '.env.local'), `STRIPE_SECRET_KEY=${LIVE_KEY}\n`, 'utf8');
    const res = resolveL11OperatorStripeKey({
      serverRoot: root,
      stripeKeyBeforeDotenv: TEST_KEY,
    });
    assert.equal(res.effectiveSource, 'process_env');
    assert.equal(res.keyMode, 'test_secret');
  });

  it('counts duplicate STRIPE_SECRET_KEY lines in files', () => {
    const root = mkdtempSync(join(tmpdir(), 'l11-key-'));
    writeFileSync(
      join(root, '.env.local'),
      `STRIPE_SECRET_KEY=${LIVE_KEY}\nSTRIPE_SECRET_KEY=${TEST_KEY}\n`,
      'utf8',
    );
    const res = resolveL11OperatorStripeKey({
      serverRoot: root,
      stripeKeyBeforeDotenv: undefined,
    });
    assert.equal(res.duplicateCount, 2);
    assert.equal(res.effectiveKey, TEST_KEY);
    assert.equal(res.effectiveSource, 'env_local');
  });

  it('refuses live key from .env when no local override', () => {
    const root = mkdtempSync(join(tmpdir(), 'l11-key-'));
    writeFileSync(join(root, '.env'), `STRIPE_SECRET_KEY=${LIVE_KEY}\n`, 'utf8');
    const res = resolveL11OperatorStripeKey({
      serverRoot: root,
      stripeKeyBeforeDotenv: undefined,
    });
    assert.equal(res.keyMode, 'live_blocked');
    assert.equal(res.rootCauseCode, 'stripe_key_not_test');
    assert.equal(res.prefixTest, false);
  });
});

describe('loadOperatorDotenv + resolveStripeSecretRaw', () => {
  it('.env.local overrides .env in process.env after load', () => {
    const root = mkdtempSync(join(tmpdir(), 'l11-dotenv-'));
    const prev = process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    writeFileSync(join(root, '.env'), `STRIPE_SECRET_KEY=${LIVE_KEY}\n`, 'utf8');
    writeFileSync(join(root, '.env.local'), `STRIPE_SECRET_KEY=${TEST_KEY}\n`, 'utf8');
    try {
      loadOperatorDotenv(root);
      assert.equal(resolveStripeSecretRaw(), TEST_KEY);
      assert.equal(stripeSecretKeyMode(resolveStripeSecretRaw()), 'test');
    } finally {
      if (prev === undefined) delete process.env.STRIPE_SECRET_KEY;
      else process.env.STRIPE_SECRET_KEY = prev;
    }
  });
});

describe('output safety', () => {
  it('normalize does not echo full key in classification path', () => {
    const mode = classifyStripeSecretKeyMode(TEST_KEY);
    assert.equal(mode, 'test_secret');
    assert.equal(normalizeStripeSecretRaw(TEST_KEY)?.includes('sk_test_'), true);
    const redacted = JSON.stringify({ mode, len: TEST_KEY.length });
    assert.equal(redacted.includes(TEST_KEY.slice(10)), false);
  });
});
