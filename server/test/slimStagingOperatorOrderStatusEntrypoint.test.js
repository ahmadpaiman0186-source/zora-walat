/**
 * Slim staging operator order status — routing and URL parse only.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Readable } from 'node:stream';

import {
  orderIdFromStagingOperatorStatusUrl,
  STAGING_OPERATOR_ORDER_STATUS_PATH_PREFIX,
} from '../api/slimStagingOperatorOrderStatusHandler.mjs';

describe('slimStagingOperatorOrderStatusHandler URL parse', () => {
  it('extracts order id from path', () => {
    const id = 'cmp91xbrt0003jm04m9ub8wrw';
    assert.equal(
      orderIdFromStagingOperatorStatusUrl(
        `${STAGING_OPERATOR_ORDER_STATUS_PATH_PREFIX}${id}`,
      ),
      id,
    );
  });
});

describe('api/index.mjs GET staging-operator-order-status routes before bootstrap', () => {
  it('returns quickly without bootstrap health-test hook', async () => {
    const events = [];
    const original = globalThis.__zwServerlessHealthTestHook;
    globalThis.__zwServerlessHealthTestHook = (e) => events.push(e);

    try {
      const { default: handler } = await import('../api/index.mjs');
      const req = Readable.from([]);
      req.method = 'GET';
      req.url = `${STAGING_OPERATOR_ORDER_STATUS_PATH_PREFIX}cmp91xbrt0003jm04m9ub8wrw`;
      req.headers = {};
      req.httpVersion = '1.1';
      req.httpVersionMajor = 1;
      req.httpVersionMinor = 1;
      const res = {
        statusCode: 200,
        headers: {},
        body: '',
        setHeader(k, v) {
          this.headers[String(k).toLowerCase()] = v;
        },
        end(data) {
          this.body = data;
        },
      };
      const t0 = Date.now();
      await handler(req, res);
      assert.ok(Date.now() - t0 < 10_000);
      assert.deepEqual(events, []);
      assert.ok(res.statusCode === 401 || res.statusCode === 503);
    } finally {
      globalThis.__zwServerlessHealthTestHook = original;
    }
  });
});
