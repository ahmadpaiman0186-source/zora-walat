/**
 * Root Vercel deployment bridge for POST /api/create-checkout-session.
 *
 * Proves L-84ZW routing bridge reaches slim checkout handler locally without
 * runtime POST, Stripe, or provider calls.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Readable } from 'node:stream';
import { afterEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import rootCheckoutHandler from '../../api/create-checkout-session.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function makeReq(method, url, body = '', headers = {}) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(String(body), 'utf8');
  const stream = Readable.from(buf.length > 0 ? [buf] : [], {
    objectMode: false,
  });
  stream.method = method;
  stream.url = url;
  stream.headers = {
    'content-type': 'application/json',
    ...headers,
  };
  stream.httpVersion = '1.1';
  stream.httpVersionMajor = 1;
  stream.httpVersionMinor = 1;
  return /** @type {import('http').IncomingMessage} */ (
    /** @type {unknown} */ (stream)
  );
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
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.setHeader('Content-Type', 'application/json; charset=utf-8');
      this.body = JSON.stringify(payload);
      this.ended = true;
      return this;
    },
    end(data) {
      if (typeof data === 'string' || Buffer.isBuffer(data)) {
        this.body = typeof data === 'string' ? data : data.toString('utf8');
      }
      this.ended = true;
    },
  };
}

function readRootVercelJson() {
  return JSON.parse(readFileSync(join(repoRoot, 'vercel.json'), 'utf8'));
}

describe('root Vercel checkout route declaration', () => {
  it('declares checkout bridge file and rewrite for alias path', () => {
    assert.equal(
      existsSync(join(repoRoot, 'api/create-checkout-session.mjs')),
      true,
    );
    const cfg = readRootVercelJson();
    assert.ok(
      cfg.rewrites.some(
        (r) =>
          r.source === '/create-checkout-session' &&
          r.destination === '/api/create-checkout-session',
      ),
      'alias /create-checkout-session must rewrite to bridge',
    );
  });
});

describe('root Vercel checkout bridge handler', () => {
  afterEach(() => {
    delete globalThis.__zwSlimCreateCheckoutImpl;
    delete globalThis.__zwSlimCheckoutResolveUser;
  });

  it('fails closed for unsupported methods', async () => {
    const req = makeReq('GET', '/api/create-checkout-session');
    const res = makeMockRes();
    await rootCheckoutHandler(req, res);
    assert.equal(res.statusCode, 405);
    assert.equal(res.headers.allow, 'POST');
  });

  it('returns 401 JSON auth_required without Bearer (no checkout orchestration)', async () => {
    let invoked = false;
    globalThis.__zwSlimCreateCheckoutImpl = async () => {
      invoked = true;
      throw new Error('must_not_invoke_checkout');
    };
    const req = makeReq('POST', '/api/create-checkout-session', '{}');
    const res = makeMockRes();
    await rootCheckoutHandler(req, res);
    assert.equal(res.statusCode, 401);
    assert.equal(invoked, false);
    const j = JSON.parse(res.body);
    assert.equal(j.code, 'auth_required');
    assert.ok(!/cs_|pi_|cus_|client_secret/.test(res.body));
  });

  it('delegates Bearer POST to slim handler and returns 415 for non-JSON without Stripe artifacts', async () => {
    globalThis.__zwSlimCheckoutResolveUser = async () => ({
      id: 'usr_bridge_test',
      email: 'bridge@test.invalid',
      role: 'user',
      emailVerified: true,
    });
    const req = makeReq('POST', '/api/create-checkout-session', '{}', {
      authorization: 'Bearer bridge-test-token',
      'content-type': 'text/plain',
    });
    const res = makeMockRes();
    await rootCheckoutHandler(req, res);
    assert.equal(res.statusCode, 415);
    assert.ok(!/cs_|pi_|cus_|client_secret/.test(res.body));
  });

  it('delegates Bearer POST to slim handler mock success without live Stripe', async () => {
    globalThis.__zwSlimCheckoutResolveUser = async () => ({
      id: 'usr_bridge_test',
      email: 'bridge@test.invalid',
      role: 'user',
      emailVerified: true,
    });
    globalThis.__zwSlimCreateCheckoutImpl = async (_req, res) =>
      res.status(200).json({
        url: 'https://checkout.stripe.test/c/pay/cs_test_mock',
        orderId: 'ck_bridge_mock',
        moneyPathOutcome: 'ACCEPTED',
      });

    const req = makeReq(
      'POST',
      '/api/create-checkout-session',
      JSON.stringify({
        currency: 'usd',
        senderCountry: 'US',
        amountUsdCents: 500,
        operatorKey: 'roshan',
        recipientPhone: '0701234567',
      }),
      {
        authorization: 'Bearer bridge-test-token',
        'idempotency-key': '550e8400-e29b-41d4-a716-446655440000',
        'user-agent': 'Mozilla/5.0',
        'x-zw-client': 'zw-staging-probe/1',
      },
    );
    const res = makeMockRes();
    await rootCheckoutHandler(req, res);
    assert.equal(res.statusCode, 200);
    const j = JSON.parse(res.body);
    assert.equal(j.orderId, 'ck_bridge_mock');
  });
});
