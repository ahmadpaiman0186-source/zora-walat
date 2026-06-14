import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

function createMockRes() {
  let statusCode = null;
  const headers = {};
  let body = null;
  let ended = false;
  return {
    headers,
    get statusCode() {
      return statusCode;
    },
    get body() {
      return body;
    },
    get ended() {
      return ended;
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
    end() {
      ended = true;
      return this;
    },
  };
}

describe('root api/health-ready bridge', () => {
  it('GET ?route=health returns { status: ok } without bootstrap hook', async () => {
    const loaded = [];
    const original = globalThis.__zwServerlessHealthTestHook;
    globalThis.__zwServerlessHealthTestHook = (event) => loaded.push(event);
    try {
      const { default: handler } = await import('../../api/health-ready.mjs');
      const res = createMockRes();
      await handler({ method: 'GET', url: '/api/health-ready?route=health' }, res);
      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.body, { status: 'ok' });
      assert.deepEqual(loaded, []);
    } finally {
      globalThis.__zwServerlessHealthTestHook = original;
    }
  });

  it('HEAD ?route=health returns 200 with empty body', async () => {
    const { default: handler } = await import('../../api/health-ready.mjs');
    const res = createMockRes();
    await handler({ method: 'HEAD', url: '/api/health-ready?route=health' }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body, null);
    assert.equal(res.ended, true);
  });

  it('POST ?route=health fails closed with 405', async () => {
    const { default: handler } = await import('../../api/health-ready.mjs');
    const res = createMockRes();
    await handler({ method: 'POST', url: '/api/health-ready?route=health' }, res);
    assert.equal(res.statusCode, 405);
    assert.equal(res.body.code, 'method_not_allowed');
    assert.equal(res.headers.allow, 'GET, HEAD');
  });

  it('GET without route query fails closed with 404', async () => {
    const { default: handler } = await import('../../api/health-ready.mjs');
    const res = createMockRes();
    await handler({ method: 'GET', url: '/api/health-ready' }, res);
    assert.equal(res.statusCode, 404);
    assert.equal(res.body.code, 'not_found');
  });

  it('GET ?route=ready delegates to handleSlimReady without bootstrap hook', async () => {
    const loaded = [];
    const original = globalThis.__zwServerlessHealthTestHook;
    globalThis.__zwServerlessHealthTestHook = (event) => loaded.push(event);
    try {
      const { default: handler } = await import('../../api/health-ready.mjs');
      const res = createMockRes();
      await handler({ method: 'GET', url: '/api/health-ready?route=ready' }, res);
      assert.deepEqual(loaded, []);
      assert.ok(res.body != null);
      assert.ok(typeof res.body.status === 'string');
      assert.ok(typeof res.body.readinessReason === 'string');
      assert.ok(!JSON.stringify(res.body).includes('DATABASE_URL'));
    } finally {
      globalThis.__zwServerlessHealthTestHook = original;
    }
  });

  it('HEAD ?route=ready fails closed with 405 GET-only', async () => {
    const { default: handler } = await import('../../api/health-ready.mjs');
    const res = createMockRes();
    await handler({ method: 'HEAD', url: '/api/health-ready?route=ready' }, res);
    assert.equal(res.statusCode, 405);
    assert.equal(res.headers.allow, 'GET');
  });
});
