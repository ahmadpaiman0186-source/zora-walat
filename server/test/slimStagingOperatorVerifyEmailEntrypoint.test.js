/**
 * Slim staging operator email verify — gated serverless entry.
 */
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { Readable } from 'node:stream';

import { handleSlimStagingOperatorVerifyEmailPost } from '../handlers/slimStagingOperatorVerifyEmailHandler.mjs';

function makeReq(body, headers = {}) {
  const buf = Buffer.from(body, 'utf8');
  const stream = Readable.from([buf], { objectMode: false });
  stream.method = 'POST';
  stream.url = '/api/ops/staging-verify-operator-email';
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
    body: '',
    setHeader() {},
    end(data) {
      if (typeof data === 'string') this.body = data;
    },
  };
}

describe('Slim staging operator verify email', () => {
  const prevAllow = process.env.STAGING_ALLOW_OPERATOR_EMAIL_VERIFY;
  const prevEmail = process.env.STAGING_OPERATOR_EMAIL;
  const prevToken = process.env.STAGING_OPERATOR_VERIFY_TOKEN;

  afterEach(() => {
    process.env.STAGING_ALLOW_OPERATOR_EMAIL_VERIFY = prevAllow;
    process.env.STAGING_OPERATOR_EMAIL = prevEmail;
    process.env.STAGING_OPERATOR_VERIFY_TOKEN = prevToken;
    delete globalThis.__zwStagingOperatorVerifyFindUserImpl;
    delete globalThis.__zwStagingOperatorVerifyUpdateUserImpl;
  });

  it('returns 503 when gate disabled', async () => {
    delete process.env.STAGING_ALLOW_OPERATOR_EMAIL_VERIFY;
    process.env.STAGING_OPERATOR_VERIFY_TOKEN = 'test-token-16chars';
    const res = makeMockRes();
    await handleSlimStagingOperatorVerifyEmailPost(
      makeReq(JSON.stringify({ email: 'op@example.com' }), {
        'x-staging-operator-verify-token': 'test-token-16chars',
      }),
      res,
    );
    assert.equal(res.statusCode, 503);
    assert.equal(JSON.parse(res.body).reason, 'staging_operator_verify_disabled');
  });

  it('returns 401 without verify token when gate enabled', async () => {
    process.env.STAGING_ALLOW_OPERATOR_EMAIL_VERIFY = 'true';
    process.env.STAGING_OPERATOR_EMAIL = 'op@example.com';
    process.env.STAGING_OPERATOR_VERIFY_TOKEN = 'test-token-16chars';
    const res = makeMockRes();
    await handleSlimStagingOperatorVerifyEmailPost(
      makeReq(JSON.stringify({ email: 'op@example.com' })),
      res,
    );
    assert.equal(res.statusCode, 401);
  });

  it('returns 403 when email mismatches STAGING_OPERATOR_EMAIL', async () => {
    process.env.STAGING_ALLOW_OPERATOR_EMAIL_VERIFY = 'true';
    process.env.STAGING_OPERATOR_EMAIL = 'op@example.com';
    process.env.STAGING_OPERATOR_VERIFY_TOKEN = 'test-token-16chars';
    const res = makeMockRes();
    await handleSlimStagingOperatorVerifyEmailPost(
      makeReq(JSON.stringify({ email: 'other@example.com' }), {
        'x-staging-operator-verify-token': 'test-token-16chars',
      }),
      res,
    );
    assert.equal(res.statusCode, 403);
  });

  it('returns 200 emailVerifiedSet when user found (mocked prisma)', async () => {
    process.env.STAGING_ALLOW_OPERATOR_EMAIL_VERIFY = 'true';
    process.env.STAGING_OPERATOR_EMAIL = 'op@example.com';
    process.env.STAGING_OPERATOR_VERIFY_TOKEN = 'test-token-16chars';

    globalThis.__zwStagingOperatorVerifyFindUserImpl = async () => ({
      id: 'u1',
      isActive: true,
      emailVerifiedAt: null,
    });
    globalThis.__zwStagingOperatorVerifyUpdateUserImpl = async () => ({});

    const res = makeMockRes();
    await handleSlimStagingOperatorVerifyEmailPost(
      makeReq(JSON.stringify({ email: 'op@example.com' }), {
        'x-staging-operator-verify-token': 'test-token-16chars',
      }),
      res,
    );
    assert.equal(res.statusCode, 200);
    const j = JSON.parse(res.body);
    assert.equal(j.operatorVerifyEmailOk, true);
    assert.equal(j.emailVerifiedSet, true);
    assert.equal(j.operatorEmailRowFound, true);
  });
});

describe('api/index routes staging operator verify before bootstrap', () => {
  it('POST returns 503 when gate off without bootstrap hook', async () => {
    const prev = process.env.STAGING_ALLOW_OPERATOR_EMAIL_VERIFY;
    delete process.env.STAGING_ALLOW_OPERATOR_EMAIL_VERIFY;
    try {
      const { default: handler } = await import('../api/index.mjs');
      const events = [];
      const original = globalThis.__zwServerlessHealthTestHook;
      globalThis.__zwServerlessHealthTestHook = (e) => events.push(e);
      const buf = Buffer.from(JSON.stringify({ email: 'op@example.com' }));
      const req = Readable.from([buf]);
      req.method = 'POST';
      req.url = '/api/ops/staging-verify-operator-email';
      req.headers = { 'content-type': 'application/json' };
      req.httpVersion = '1.1';
      req.httpVersionMajor = 1;
      req.httpVersionMinor = 1;
      const res = makeMockRes();
      await handler(req, res);
      assert.deepEqual(events, []);
      assert.equal(res.statusCode, 503);
    } finally {
      process.env.STAGING_ALLOW_OPERATOR_EMAIL_VERIFY = prev;
    }
  });
});
