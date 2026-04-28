import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';

import { createApp } from '../src/app.js';

describe('checkout return routes (non-production)', () => {
  it('GET /success returns HTML with session and order query echoed', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/success')
      .query({ session_id: 'cs_test_abc', order_id: 'ord_123' })
      .expect(200);
    assert.match(res.text, /cs_test_abc/);
    assert.match(res.text, /ord_123/);
    assert.match(res.text, /Payment successful/i);
  });

  it('GET /cancel returns HTML', async () => {
    const app = createApp();
    const res = await request(app).get('/cancel').expect(200);
    assert.match(res.text, /cancelled/i);
  });

  it('GET /success without query shows operator note about missing params', async () => {
    const app = createApp();
    const res = await request(app).get('/success').expect(200);
    assert.match(res.text, /Expected query params/i);
  });
});
