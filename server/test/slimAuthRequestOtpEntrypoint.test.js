/**
 * Slim serverless POST /api/auth/request-otp — fast path without full bootstrap.
 */
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { Readable } from 'node:stream';

import { handleSlimAuthRequestOtpPost } from '../api/slimAuthRequestOtpHandler.mjs';
import { AUTH_ERROR_CODE } from '../src/constants/authErrors.js';
import { API_CONTRACT_CODE } from '../src/constants/apiContractCodes.js';
import { clearSlidingWindowsForTests } from '../src/services/risk/riskSlidingWindow.js';

function otpProbeEmail() {
  const owner = String(process.env.OWNER_ALLOWED_EMAIL ?? '')
    .trim()
    .toLowerCase();
  return owner.length > 0 ? owner : 'slim_otp_probe@example.com';
}

/**
 * @param {string} body
 * @param {Record<string, string | string[] | undefined>} [headers]
 */
function makeRequestOtpReq(body, headers = {}) {
  const buf = Buffer.from(body, 'utf8');
  const stream = Readable.from([buf], { objectMode: false });
  stream.method = 'POST';
  stream.url = '/api/auth/request-otp';
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

describe('Slim auth request-otp serverless entry', () => {
  afterEach(() => {
    delete globalThis.__zwSlimAuthRequestEmailOtpImpl;
    clearSlidingWindowsForTests();
  });

  it('returns 415 quickly for non-JSON content-type', async () => {
    const req = makeRequestOtpReq('{}', { 'content-type': 'text/plain' });
    const res = makeMockRes();
    const t0 = Date.now();
    await handleSlimAuthRequestOtpPost(req, res);
    assert.ok(Date.now() - t0 < 5000);
    assert.equal(res.statusCode, 415);
    assert.equal(parseBody(res).code, API_CONTRACT_CODE.UNSUPPORTED_MEDIA_TYPE);
  });

  it('returns 400 invalid_json_body for invalid JSON', async () => {
    const req = makeRequestOtpReq('{not-json');
    const res = makeMockRes();
    await handleSlimAuthRequestOtpPost(req, res);
    assert.equal(res.statusCode, 400);
    assert.equal(parseBody(res).code, API_CONTRACT_CODE.INVALID_JSON_BODY);
  });

  it('returns 400 validation_error for strict body violation', async () => {
    const req = makeRequestOtpReq(
      JSON.stringify({ email: otpProbeEmail(), extraField: 'nope' }),
    );
    const res = makeMockRes();
    await handleSlimAuthRequestOtpPost(req, res);
    assert.equal(res.statusCode, 400);
    assert.equal(parseBody(res).code, AUTH_ERROR_CODE.VALIDATION_ERROR);
  });

  it('returns 403 owner_only when OWNER_ALLOWED_EMAIL set and email mismatches', async () => {
    const owner = String(process.env.OWNER_ALLOWED_EMAIL ?? '').trim();
    if (!owner) {
      return;
    }
    const req = makeRequestOtpReq(
      JSON.stringify({ email: 'other_person@example.com' }),
    );
    const res = makeMockRes();
    await handleSlimAuthRequestOtpPost(req, res);
    assert.equal(res.statusCode, 403);
    assert.equal(parseBody(res).code, AUTH_ERROR_CODE.OWNER_ONLY_ACCESS_DENIED);
  });

  it('returns 200 public contract when requestEmailOtp succeeds (mocked)', async () => {
    globalThis.__zwSlimAuthRequestEmailOtpImpl = async () => ({
      success: true,
      ok: true,
      message: 'If this email is registered, a code was sent.',
      hint: 'Check your inbox',
      retryAfterSeconds: 60,
    });
    const req = makeRequestOtpReq(JSON.stringify({ email: otpProbeEmail() }));
    const res = makeMockRes();
    const t0 = Date.now();
    await handleSlimAuthRequestOtpPost(req, res);
    assert.ok(Date.now() - t0 < 5000);
    assert.equal(res.statusCode, 200);
    const j = parseBody(res);
    assert.equal(j.ok, true);
    assert.ok(typeof j.message === 'string');
    assert.ok(!/^\d{6}$/.test(j.message), 'must not echo OTP in JSON body');
  });
});

describe('api/index.mjs POST /api/auth/request-otp routes to slim handler', () => {
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
      req.url = '/api/auth/request-otp';
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
      assert.equal(parseBody(res).code, API_CONTRACT_CODE.UNSUPPORTED_MEDIA_TYPE);
    } finally {
      globalThis.__zwServerlessHealthTestHook = original;
    }
  });
});
