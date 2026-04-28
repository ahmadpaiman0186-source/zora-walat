/**
 * Dev checkout header bypass must not apply when OWNER_ALLOWED_EMAIL is enforced.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';

import { AUTH_ERROR_CODE } from '../../src/constants/authErrors.js';

const { createApp } = await import('../../src/app.js');

const app = createApp();

describe('owner-only disables dev checkout bypass (child)', () => {
  it('GET /api/auth/me with X-ZW-Dev-Checkout still returns 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('X-ZW-Dev-Checkout', 'dev-bypass-secret-16chars-min');
    assert.equal(res.status, 401);
    assert.equal(res.body?.code, AUTH_ERROR_CODE.AUTH_REQUIRED);
  });
});
