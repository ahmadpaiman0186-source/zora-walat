import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { resolveCheckoutClientBase } from '../src/lib/checkoutClientBase.js';

const originalPrelaunchLockdown = env.prelaunchLockdown;

after(() => {
  env.prelaunchLockdown = originalPrelaunchLockdown;
});

describe('resolveCheckoutClientBase', () => {
  it('uses CLIENT_URL in production', () => {
    const result = resolveCheckoutClientBase({
      nodeEnv: 'production',
      clientUrl: 'https://app.example.com/',
      origin: '',
    });

    assert.deepEqual(result, {
      ok: true,
      clientBase: 'https://app.example.com',
      source: 'client_url',
    });
  });

  it('prefers Origin in non-production browser flows', () => {
    const result = resolveCheckoutClientBase({
      nodeEnv: 'development',
      clientUrl: 'http://127.0.0.1:3001',
      origin: 'http://localhost:3001/',
    });

    assert.deepEqual(result, {
      ok: true,
      clientBase: 'http://localhost:3001',
      source: 'origin',
    });
  });

  it('falls back to CLIENT_URL in non-production when Origin is absent', () => {
    const result = resolveCheckoutClientBase({
      nodeEnv: 'development',
      clientUrl: 'http://127.0.0.1:3001/',
      origin: '',
    });

    assert.deepEqual(result, {
      ok: true,
      clientBase: 'http://127.0.0.1:3001',
      source: 'client_url_fallback',
    });
  });

  it('fails clearly when neither Origin nor CLIENT_URL is available', () => {
    const result = resolveCheckoutClientBase({
      nodeEnv: 'development',
      clientUrl: '',
      origin: '',
    });

    assert.equal(result.ok, false);
    assert.equal(result.status, 400);
    assert.match(result.error, /Missing checkout client base URL/);
  });
});

describe('payment route prelaunch guardrails', () => {
  it('blocks create-payment-intent during prelaunch lockdown', async () => {
    env.prelaunchLockdown = true;
    const app = createApp();

    const res = await request(app)
      .post('/create-payment-intent')
      .set('Content-Type', 'application/json')
      .send({ amount: 500 });

    assert.equal(res.status, 503);
    assert.equal(res.body?.success, false);
    assert.equal(res.body?.code, 'prelaunch_lockdown');
    assert.equal(
      res.body?.message,
      'Service temporarily unavailable (pre-launch)',
    );
    assert.equal(
      res.body?.error,
      'Service temporarily unavailable (pre-launch)',
    );
  });
});
