/**
 * Slim GET /success and /cancel — no bootstrap cold start.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Readable } from 'node:stream';

import { handleSlimCheckoutReturnGet } from '../handlers/slimCheckoutReturnHandler.mjs';

function makeGetReq(url) {
  const stream = Readable.from([]);
  stream.method = 'GET';
  stream.url = url;
  stream.headers = {};
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
    setHeader(key, val) {
      this.headers[String(key).toLowerCase()] = val;
    },
    end(data) {
      if (typeof data === 'string') this.body = data;
    },
  };
}

describe('Slim checkout return handler', () => {
  it('GET /success returns HTML under 2s without full session id in body', async () => {
    const req = makeGetReq(
      '/success?session_id=cs_test_abcdefghijklmnop&order_id=cmp91xbrt0003jm04m9ub8wrw',
    );
    const res = makeMockRes();
    const t0 = Date.now();
    await handleSlimCheckoutReturnGet(req, res);
    assert.ok(Date.now() - t0 < 2000);
    assert.equal(res.statusCode, 200);
    assert.match(res.headers['content-type'] ?? '', /text\/html/);
    assert.ok(res.body.includes('Payment successful'));
    assert.ok(!res.body.includes('cs_test_abcdefghijklmnop'));
    assert.ok(!res.body.includes('cmp91xbrt0003jm04m9ub8wrw'));
    assert.ok(res.body.includes('…'));
  });

  it('GET /cancel returns HTML quickly', async () => {
    const req = makeGetReq('/cancel');
    const res = makeMockRes();
    const t0 = Date.now();
    await handleSlimCheckoutReturnGet(req, res);
    assert.ok(Date.now() - t0 < 2000);
    assert.equal(res.statusCode, 200);
    assert.ok(res.body.includes('cancelled'));
  });
});

describe('api/index.mjs GET /success routes to slim handler', () => {
  it('does not trigger bootstrap health-test hook', async () => {
    const events = [];
    const original = globalThis.__zwServerlessHealthTestHook;
    globalThis.__zwServerlessHealthTestHook = (e) => events.push(e);
    try {
      const { default: handler } = await import('../api/index.mjs');
      const req = Readable.from([]);
      req.method = 'GET';
      req.url = '/success?session_id=cs_test_x&order_id=cmp91xbrt00';
      req.headers = {};
      req.httpVersion = '1.1';
      req.httpVersionMajor = 1;
      req.httpVersionMinor = 1;
      const res = makeMockRes();
      const t0 = Date.now();
      await handler(req, res);
      assert.ok(Date.now() - t0 < 2000);
      assert.deepEqual(events, []);
      assert.equal(res.statusCode, 200);
    } finally {
      globalThis.__zwServerlessHealthTestHook = original;
    }
  });
});
