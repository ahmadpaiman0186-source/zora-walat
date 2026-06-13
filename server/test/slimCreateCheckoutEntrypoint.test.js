/**
 * Slim serverless POST /api/create-checkout-session — bearer path without full bootstrap.
 */
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { Readable } from 'node:stream';

import { handleSlimCreateCheckoutPost } from '../handlers/slimCreateCheckoutHandler.mjs';

function makeCheckoutReq(body, headers = {}) {
  const buf = Buffer.from(JSON.stringify(body), 'utf8');
  const stream = Readable.from([buf], { objectMode: false });
  stream.method = 'POST';
  stream.url = '/api/create-checkout-session';
  stream.headers = {
    'content-type': 'application/json',
    authorization: 'Bearer test-token-value',
    'idempotency-key': '550e8400-e29b-41d4-a716-446655440000',
    'user-agent': 'Mozilla/5.0',
    'x-zw-client': 'zw-staging-probe/1',
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
    writableEnded: false,
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
      this.writableEnded = true;
      return this;
    },
    end(data) {
      if (typeof data === 'string') this.body = data;
      this.ended = true;
      this.writableEnded = true;
    },
  };
}

function stubVerifiedUser() {
  globalThis.__zwSlimCheckoutResolveUser = async () => ({
    id: 'usr_slim_checkout_test',
    email: 'slim-checkout@test.invalid',
    role: 'user',
    emailVerified: true,
  });
}

describe('Slim create-checkout serverless entry', () => {
  afterEach(() => {
    delete globalThis.__zwSlimCreateCheckoutImpl;
    delete globalThis.__zwSlimCheckoutResolveUser;
  });

  it('returns 401 when bearer token is missing', async () => {
    const buf = Buffer.from('{}');
    const stream = Readable.from([buf]);
    stream.method = 'POST';
    stream.url = '/api/create-checkout-session';
    stream.headers = { 'content-type': 'application/json' };
    stream.httpVersion = '1.1';
    stream.httpVersionMajor = 1;
    stream.httpVersionMinor = 1;
    const res = makeMockRes();
    await handleSlimCreateCheckoutPost(
      /** @type {import('http').IncomingMessage} */ (/** @type {unknown} */ (stream)),
      res,
    );
    assert.equal(res.statusCode, 401);
  });

  it('returns 415 for non-JSON content-type', async () => {
    stubVerifiedUser();
    const buf = Buffer.from('{}');
    const stream = Readable.from([buf]);
    stream.method = 'POST';
    stream.url = '/api/create-checkout-session';
    stream.headers = {
      'content-type': 'text/plain',
      authorization: 'Bearer test-token-value',
    };
    stream.httpVersion = '1.1';
    stream.httpVersionMajor = 1;
    stream.httpVersionMinor = 1;
    const res = makeMockRes();
    const t0 = Date.now();
    await handleSlimCreateCheckoutPost(
      /** @type {import('http').IncomingMessage} */ (/** @type {unknown} */ (stream)),
      res,
    );
    assert.ok(Date.now() - t0 < 5000);
    assert.equal(res.statusCode, 415);
  });

  it('returns 200 with orderId when checkout orchestration succeeds (mocked)', async () => {
    stubVerifiedUser();
    globalThis.__zwSlimCreateCheckoutImpl = async (_req, res) =>
      res.status(200).json({
        url: 'https://checkout.stripe.test/c/pay/cs_test_mock',
        orderId: 'ck_test_order_mock',
        orderReference: 'ck_test_order_mock',
        moneyPathOutcome: 'ACCEPTED',
      });

    const res = makeMockRes();
    const t0 = Date.now();
    await handleSlimCreateCheckoutPost(
      makeCheckoutReq({
        currency: 'usd',
        senderCountry: 'US',
        amountUsdCents: 500,
        operatorKey: 'roshan',
        recipientPhone: '0701234567',
      }),
      res,
    );
    assert.ok(Date.now() - t0 < 5000);
    assert.equal(res.statusCode, 200);
    const j = JSON.parse(res.body);
    assert.equal(j.orderId, 'ck_test_order_mock');
    assert.ok(typeof j.url === 'string' && j.url.includes('stripe'));
  });
});

describe('api/index.mjs POST /api/create-checkout-session routes to slim handler', () => {
  it('non-JSON content-type returns 415 without bootstrap health-test hook', async () => {
    const events = [];
    const original = globalThis.__zwServerlessHealthTestHook;
    globalThis.__zwServerlessHealthTestHook = (e) => events.push(e);

    try {
      const { default: handler } = await import('../api/index.mjs');
      const buf = Buffer.from('{}');
      const req = Readable.from([buf], { objectMode: false });
      req.method = 'POST';
      req.url = '/api/create-checkout-session';
      req.headers = {
        'content-type': 'text/plain',
        authorization: 'Bearer probe-token',
      };
      req.httpVersion = '1.1';
      req.httpVersionMajor = 1;
      req.httpVersionMinor = 1;
      const res = makeMockRes();
      const out = handler(req, res);
      assert.ok(out && typeof out.then === 'function');
      await out;
      assert.deepEqual(events, []);
      assert.equal(res.statusCode, 415);
    } finally {
      globalThis.__zwServerlessHealthTestHook = original;
    }
  });
});
