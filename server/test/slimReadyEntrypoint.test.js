import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { handleSlimReady } from '../api/slimReadyHandler.mjs';

function assertPayloadHasNoSecretLikeStrings(payload) {
  const s = JSON.stringify(payload);
  const patterns = [
    /postgres:\/\//i,
    /mysql:\/\//i,
    /mongodb(\+srv)?:\/\//i,
  ];
  for (const p of patterns) {
    assert.ok(!p.test(s), `unexpected URL-like secret pattern in JSON`);
  }
  assert.ok(!s.includes('DATABASE_URL'));
  assert.ok(!s.includes('sk_live_'));
  assert.ok(!s.includes('sk_test_'));
  assert.ok(!s.includes('whsec_'));
}

function createMockRes() {
  let statusCode = null;
  const headers = {};
  let body = null;
  return {
    headers,
    get statusCode() {
      return statusCode;
    },
    get body() {
      return body;
    },
    setHeader(name, value) {
      headers[String(name).toLowerCase()] = value;
    },
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      body = payload;
      return this;
    },
  };
}

describe('slim serverless /ready entrypoint', () => {
  it('handleSlimReady returns fast 503 when outer deadline is exceeded', async () => {
    const res = createMockRes();
    const started = Date.now();
    await handleSlimReady(res, {
      deadlineMs: 40,
      runProbe: () =>
        new Promise(() => {
          /* hang */
        }),
    });
    const elapsed = Date.now() - started;
    assert.ok(elapsed < 2000, `expected sub-second deadline behavior, took ${elapsed}ms`);
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.status, 'unavailable');
    assert.equal(res.body.readinessReason, 'slim_ready_deadline');
    assert.equal(typeof res.body.checkedAt, 'string');
    assert.equal(res.body.timeoutMs, 40);
    assert.deepEqual(Object.keys(res.body).sort(), [
      'checkedAt',
      'readinessReason',
      'status',
      'timeoutMs',
    ]);
    assertPayloadHasNoSecretLikeStrings(res.body);
  });

  it('handleSlimReady returns 200 when probe reports database_ok', async () => {
    const res = createMockRes();
    await handleSlimReady(res, {
      runProbe: async () => ({
        ok: true,
        checks: {
          database: 'ok',
          webTopupPersistence: 'ok',
        },
      }),
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.status, 'ready');
    assert.equal(res.body.readinessReason, 'database_ok');
    assertPayloadHasNoSecretLikeStrings(res.body);
  });

  it('handleSlimReady returns 503 when database core fails without leaking checks', async () => {
    const res = createMockRes();
    await handleSlimReady(res, {
      runProbe: async () => ({
        ok: false,
        checks: { database: 'failed', secret: 'postgres://user:pass@host/db' },
        readinessReason: 'db_error',
      }),
    });
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.readinessReason, 'db_error');
    const serialized = JSON.stringify(res.body);
    assert.ok(!serialized.includes('postgres'));
    assert.ok(!serialized.includes('checks'));
    assertPayloadHasNoSecretLikeStrings(res.body);
  });

  it('GET /ready via api/index.mjs does not import bootstrap (no hook events)', async () => {
    const loaded = [];
    const original = globalThis.__zwServerlessHealthTestHook;
    globalThis.__zwServerlessHealthTestHook = (event) => loaded.push(event);
    try {
      const { default: handler } = await import('../api/index.mjs');
      const res = createMockRes();
      await handler({ method: 'GET', url: '/ready?fmt=json' }, res);
      assert.deepEqual(loaded, []);
      assert.ok(res.body != null);
      assert.ok(typeof res.body.status === 'string');
      assert.ok(typeof res.body.readinessReason === 'string');
      assertPayloadHasNoSecretLikeStrings(res.body);
    } finally {
      globalThis.__zwServerlessHealthTestHook = original;
    }
  });

  it('GET /health still returns { status: ok } without bootstrap', async () => {
    const loaded = [];
    const original = globalThis.__zwServerlessHealthTestHook;
    globalThis.__zwServerlessHealthTestHook = (event) => loaded.push(event);
    try {
      const { default: handler } = await import('../api/index.mjs');
      const res = createMockRes();
      await handler({ method: 'GET', url: '/health' }, res);
      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.body, { status: 'ok' });
      assert.deepEqual(loaded, []);
    } finally {
      globalThis.__zwServerlessHealthTestHook = original;
    }
  });
});
