/**
 * Slim serverless POST /api/auth/login — fast reject without full bootstrap.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Readable } from 'node:stream';

import { handleSlimAuthLoginPost } from '../api/slimAuthLoginHandler.mjs';

/**
 * @param {string} body
 * @param {Record<string, string | string[] | undefined>} [headers]
 */
function makeLoginReq(body, headers = {}) {
  const buf = Buffer.from(body, 'utf8');
  const stream = Readable.from([buf], { objectMode: false });
  stream.method = 'POST';
  stream.url = '/api/auth/login';
  stream.headers = {
    'content-type': 'application/json',
    ...headers,
  };
  stream.httpVersion = '1.1';
  stream.httpVersionMajor = 1;
  stream.httpVersionMinor = 1;
  return /** @type {import('http').IncomingMessage} */ (/** @type {unknown} */ (stream));
}

function makeMockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    ended: false,
    setHeader(key, val) {
      this.headers[String(key).toLowerCase()] = val;
    },
    end(data) {
      if (typeof data === 'string' || Buffer.isBuffer(data)) {
        this.body = typeof data === 'string' ? data : data.toString('utf8');
      }
      this.ended = true;
    },
  };
}

function assertNoTokenLeak(text) {
  const s = String(text ?? '');
  assert.ok(!/eyJ[A-Za-z0-9_-]{20,}/.test(s), 'must not echo JWT-shaped tokens in test output');
}

describe('Slim auth login serverless entry', () => {
  it('returns 400 quickly for non-JSON content-type', async () => {
    const req = makeLoginReq('{}', { 'content-type': 'text/plain' });
    const res = makeMockRes();
    const t0 = Date.now();
    await handleSlimAuthLoginPost(req, res);
    assert.ok(Date.now() - t0 < 5000);
    assert.equal(res.statusCode, 400);
    assertNoTokenLeak(res.body);
  });

  it('returns 400 for invalid JSON body', async () => {
    const req = makeLoginReq('{not-json');
    const res = makeMockRes();
    await handleSlimAuthLoginPost(req, res);
    assert.equal(res.statusCode, 400);
    assertNoTokenLeak(res.body);
  });

  it('returns bounded 401 or 403 for failed login probe', async () => {
    const req = makeLoginReq(
      JSON.stringify({
        email: `slim_login_${Date.now()}@test.invalid`,
        password: 'invalid-probe-password-xyz',
      }),
    );
    const res = makeMockRes();
    const t0 = Date.now();
    await handleSlimAuthLoginPost(req, res);
    const ms = Date.now() - t0;
    assert.ok(ms < 15_000, `expected bounded response, took ${ms}ms`);
    assert.ok(
      res.statusCode === 401 || res.statusCode === 403,
      `expected auth denial, got ${res.statusCode}`,
    );
    const j = JSON.parse(res.body);
    assert.ok(
      j.code === 'auth_invalid_credentials' ||
        j.code === 'owner_only_prelaunch_access_denied',
    );
    assertNoTokenLeak(res.body);
  });
});

describe('api/index.mjs POST /api/auth/login routes to slim handler', () => {
  it('missing JSON content-type returns 400 without bootstrap health-test hook', async () => {
    const events = [];
    const original = globalThis.__zwServerlessHealthTestHook;
    globalThis.__zwServerlessHealthTestHook = (e) => {
      events.push(e);
    };
    try {
      const { default: handler } = await import('../api/index.mjs');
      const buf = Buffer.from('{}');
      const req = Readable.from([buf], { objectMode: false });
      req.method = 'POST';
      req.url = '/api/auth/login';
      req.headers = { 'content-type': 'text/plain' };
      req.httpVersion = '1.1';
      req.httpVersionMajor = 1;
      req.httpVersionMinor = 1;
      const res = makeMockRes();
      const out = handler(req, res);
      assert.ok(out && typeof out.then === 'function');
      await out;
      assert.deepEqual(events, []);
      assert.equal(res.statusCode, 400);
      assertNoTokenLeak(res.body);
    } finally {
      globalThis.__zwServerlessHealthTestHook = original;
    }
  });
});
