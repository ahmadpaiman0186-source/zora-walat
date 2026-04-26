import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';

import { AUTH_ERROR_CODE } from '../src/constants/authErrors.js';
import { API_CONTRACT_CODE } from '../src/constants/apiContractCodes.js';
import { createApp } from '../src/app.js';

describe('API contract — middleware & fallbacks (no DB)', () => {
  const app = createApp();

  it('GET unknown /api route returns not_found contract', async () => {
    const res = await request(app).get('/api/contract-test-missing-route-abc');
    assert.equal(res.status, 404);
    assert.equal(res.body?.success, false);
    assert.equal(res.body?.code, API_CONTRACT_CODE.NOT_FOUND);
    assert.equal(res.body?.message, res.body?.error);
  });

  it('staff ops route without JWT returns auth contract', async () => {
    const res = await request(app).get('/api/admin/ops/phase1-report');
    assert.equal(res.status, 401);
    assert.equal(res.body?.success, false);
    assert.equal(res.body?.code, AUTH_ERROR_CODE.AUTH_REQUIRED);
    assert.equal(res.body?.message, res.body?.error);
  });
});
