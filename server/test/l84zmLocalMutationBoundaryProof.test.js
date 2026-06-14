/**
 * L-84ZM — local code/test mutation-boundary proof (no runtime POST).
 * Supplements existing slim entrypoint suites with explicit side-effect guard assertions.
 */
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { Readable } from 'node:stream';

import { handleSlimCreateCheckoutPost } from '../handlers/slimCreateCheckoutHandler.mjs';
import { handleSlimAuthLoginPost } from '../handlers/slimAuthLoginHandler.mjs';

function makeMockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    ended: false,
    setHeader(key, val) {
      this.headers[String(key).toLowerCase()] = val;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = JSON.stringify(payload);
      this.ended = true;
      return this;
    },
    end(data) {
      if (typeof data === 'string') this.body = data;
      this.ended = true;
    },
  };
}

describe('L-84ZM local mutation boundary guards', () => {
  afterEach(() => {
    delete globalThis.__zwSlimCreateCheckoutImpl;
    delete globalThis.__zwSlimCheckoutResolveUser;
  });

  it('checkout without bearer returns 401 before orchestration mock runs', async () => {
    let checkoutOrchestrationCalled = false;
    globalThis.__zwSlimCreateCheckoutImpl = async () => {
      checkoutOrchestrationCalled = true;
      throw new Error('must_not_reach_checkout_orchestration');
    };

    const buf = Buffer.from('{}');
    const req = Readable.from([buf]);
    req.method = 'POST';
    req.url = '/api/create-checkout-session';
    req.headers = { 'content-type': 'application/json' };
    req.httpVersion = '1.1';
    req.httpVersionMajor = 1;
    req.httpVersionMinor = 1;

    const res = makeMockRes();
    await handleSlimCreateCheckoutPost(
      /** @type {import('http').IncomingMessage} */ (/** @type {unknown} */ (req)),
      res,
    );

    assert.equal(res.statusCode, 401);
    assert.equal(checkoutOrchestrationCalled, false);
    const j = JSON.parse(res.body);
    assert.equal(j.code, 'auth_required');
    assert.ok(!('orderId' in j));
    assert.ok(!('url' in j));
  });

  it('login with empty JSON object fails validation before accessToken issuance', async () => {
    const req = Readable.from([Buffer.from('{}')]);
    req.method = 'POST';
    req.url = '/api/auth/login';
    req.headers = { 'content-type': 'application/json' };
    req.httpVersion = '1.1';
    req.httpVersionMajor = 1;
    req.httpVersionMinor = 1;

    const res = makeMockRes();
    await handleSlimAuthLoginPost(
      /** @type {import('http').IncomingMessage} */ (/** @type {unknown} */ (req)),
      res,
    );

    assert.ok(res.statusCode === 400 || res.statusCode === 403);
    const j = JSON.parse(res.body);
    assert.ok(
      j.code === 'validation_error' ||
        j.code === 'auth_invalid_credentials' ||
        j.code === 'owner_only_prelaunch_access_denied',
    );
    assert.ok(!('accessToken' in j));
  });
});
