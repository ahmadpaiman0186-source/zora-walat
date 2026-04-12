import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

describe('serverless health entry', () => {
  it('returns JSON ok for GET /health without loading app graph', async () => {
    const loaded = [];
    const original = globalThis.__zwServerlessHealthTestHook;
    globalThis.__zwServerlessHealthTestHook = (event) => loaded.push(event);
    try {
      const { default: handler } = await import('../api/index.mjs');
      let statusCode = null;
      const headers = {};
      let body = null;
      const req = { method: 'GET', url: '/health' };
      const res = {
        setHeader(name, value) {
          headers[name.toLowerCase()] = value;
        },
        status(code) {
          statusCode = code;
          return this;
        },
        json(payload) {
          body = payload;
          return this;
        },
      };

      await handler(req, res);

      assert.equal(statusCode, 200);
      assert.deepEqual(body, { status: 'ok' });
      assert.equal(headers['cache-control'], 'no-store');
      assert.deepEqual(loaded, []);
    } finally {
      globalThis.__zwServerlessHealthTestHook = original;
    }
  });
});
