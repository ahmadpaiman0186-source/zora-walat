/**
 * Slim staging operator refund-target — routing only.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Readable } from 'node:stream';

import {
  orderIdFromStagingOperatorRefundTargetUrl,
  STAGING_OPERATOR_REFUND_TARGET_PATH_PREFIX,
} from '../api/slimStagingOperatorRefundTargetHandler.mjs';

describe('slimStagingOperatorRefundTargetHandler URL parse', () => {
  it('extracts order id from path', () => {
    const id = 'cmp95a2kc0003jy04pvq0dr78';
    assert.equal(
      orderIdFromStagingOperatorRefundTargetUrl(
        `${STAGING_OPERATOR_REFUND_TARGET_PATH_PREFIX}${id}`,
      ),
      id,
    );
  });
});

describe('api/index.mjs GET staging-operator-refund-target routes before bootstrap', () => {
  it('returns quickly without bootstrap health-test hook', async () => {
    const events = [];
    const original = globalThis.__zwServerlessHealthTestHook;
    globalThis.__zwServerlessHealthTestHook = (e) => events.push(e);

    try {
      const { default: handler } = await import('../api/index.mjs');
      const req = Readable.from([]);
      req.method = 'GET';
      req.url = `${STAGING_OPERATOR_REFUND_TARGET_PATH_PREFIX}cmp95a2kc0003jy04pvq0dr78`;
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
