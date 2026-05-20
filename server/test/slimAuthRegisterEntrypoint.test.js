/**
 * Slim serverless POST /api/auth/register — fast path without full bootstrap.
 */
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { Readable } from 'node:stream';

import { handleSlimAuthRegisterPost } from '../api/slimAuthRegisterHandler.mjs';
import { AUTH_ERROR_CODE } from '../src/constants/authErrors.js';
import { API_CONTRACT_CODE } from '../src/constants/apiContractCodes.js';
import { HttpError } from '../src/lib/httpError.js';

/** Email that passes owner-only gate when `OWNER_ALLOWED_EMAIL` is set in test env. */
function registerProbeEmail() {
  const owner = String(process.env.OWNER_ALLOWED_EMAIL ?? '')
    .trim()
    .toLowerCase();
  return owner.length > 0 ? owner : 'slim_reg_probe@example.com';
}

/**
 * @param {string} body
 * @param {Record<string, string | string[] | undefined>} [headers]
 */
function makeRegisterReq(body, headers = {}) {
  const buf = Buffer.from(body, 'utf8');
  const stream = Readable.from([buf], { objectMode: false });
  stream.method = 'POST';
  stream.url = '/api/auth/register';
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

function parseBody(res) {
  return JSON.parse(res.body);
}

describe('Slim auth register serverless entry', () => {
  afterEach(() => {
    delete globalThis.__zwSlimAuthRegisterUserImpl;
  });

  it('returns 415 quickly for non-JSON content-type', async () => {
    const req = makeRegisterReq('{}', { 'content-type': 'text/plain' });
    const res = makeMockRes();
    const t0 = Date.now();
    await handleSlimAuthRegisterPost(req, res);
    assert.ok(Date.now() - t0 < 5000);
    assert.equal(res.statusCode, 415);
    const j = parseBody(res);
    assert.equal(j.code, API_CONTRACT_CODE.UNSUPPORTED_MEDIA_TYPE);
  });

  it('returns 400 invalid_json_body for invalid JSON', async () => {
    const req = makeRegisterReq('{not-json');
    const res = makeMockRes();
    await handleSlimAuthRegisterPost(req, res);
    assert.equal(res.statusCode, 400);
    const j = parseBody(res);
    assert.equal(j.code, API_CONTRACT_CODE.INVALID_JSON_BODY);
  });

  it('returns 400 validation_error for short password', async () => {
    const req = makeRegisterReq(
      JSON.stringify({ email: registerProbeEmail(), password: 'short' }),
    );
    const res = makeMockRes();
    await handleSlimAuthRegisterPost(req, res);
    assert.equal(res.statusCode, 400);
    const j = parseBody(res);
    assert.equal(j.code, AUTH_ERROR_CODE.VALIDATION_ERROR);
  });

  it('returns 409 auth_email_exists when registerUser rejects duplicate', async () => {
    globalThis.__zwSlimAuthRegisterUserImpl = async () => {
      throw new HttpError(409, 'Account already exists', {
        code: AUTH_ERROR_CODE.AUTH_EMAIL_EXISTS,
      });
    };
    const req = makeRegisterReq(
      JSON.stringify({
        email: registerProbeEmail(),
        password: 'valid-password-10',
      }),
    );
    const res = makeMockRes();
    await handleSlimAuthRegisterPost(req, res);
    assert.equal(res.statusCode, 409);
    const j = parseBody(res);
    assert.equal(j.code, AUTH_ERROR_CODE.AUTH_EMAIL_EXISTS);
  });

  it('returns 201 when registerUser succeeds (mocked)', async () => {
    const probeEmail = registerProbeEmail();
    globalThis.__zwSlimAuthRegisterUserImpl = async () => ({
      accessToken: 'mock-access-token-not-a-jwt',
      refreshToken: 'mock-refresh-token-value-here',
      expiresIn: 900,
      user: {
        id: 'usr_mock',
        email: probeEmail,
        role: 'user',
        emailVerified: false,
      },
    });
    const req = makeRegisterReq(
      JSON.stringify({
        email: probeEmail,
        password: 'valid-password-10',
      }),
    );
    const res = makeMockRes();
    const t0 = Date.now();
    await handleSlimAuthRegisterPost(req, res);
    assert.ok(Date.now() - t0 < 5000);
    assert.equal(res.statusCode, 201);
    const j = parseBody(res);
    assert.equal(j.user?.emailVerified, false);
    assert.ok(typeof j.accessToken === 'string');
  });
});

describe('api/index.mjs POST /api/auth/register routes to slim handler', () => {
  it('missing JSON content-type returns 415 without bootstrap health-test hook', async () => {
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
      req.url = '/api/auth/register';
      req.headers = { 'content-type': 'text/plain' };
      req.httpVersion = '1.1';
      req.httpVersionMajor = 1;
      req.httpVersionMinor = 1;
      const res = makeMockRes();
      const out = handler(req, res);
      assert.ok(out && typeof out.then === 'function');
      await out;
      assert.deepEqual(events, []);
      assert.equal(res.statusCode, 415);
      const j = parseBody(res);
      assert.equal(j.code, API_CONTRACT_CODE.UNSUPPORTED_MEDIA_TYPE);
    } finally {
      globalThis.__zwServerlessHealthTestHook = original;
    }
  });
});
