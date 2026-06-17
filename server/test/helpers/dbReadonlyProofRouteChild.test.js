/**
 * Subprocess-only route tests — OPS_HEALTH_TOKEN set in parent env before spawn.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';

const OPS = String(process.env.OPS_HEALTH_TOKEN ?? '').trim();
assert.ok(OPS.length >= 16, 'child requires OPS_HEALTH_TOKEN from parent spawn env');

const {
  DB_READONLY_PROOF_ALLOWED_RESPONSE_KEYS,
  dbReadonlyProofInvariants,
} = await import('../../src/lib/dbReadonlyProofContract.js');
const express = (await import('express')).default;
const { default: opsRouter } = await import('../../src/routes/ops.routes.js');

const app = express();
app.use((req, _res, next) => {
  req.log = { info: () => {} };
  next();
});
app.use('/ops', opsRouter);

function assertSafeResponseBody(body) {
  const invariants = dbReadonlyProofInvariants();
  for (const [key, value] of Object.entries(invariants)) {
    assert.equal(body[key], value);
  }
  for (const key of Object.keys(body)) {
    assert.ok(DB_READONLY_PROOF_ALLOWED_RESPONSE_KEYS.includes(key), key);
  }
}

describe('L-85K db-readonly-proof route (child)', () => {
  it('GET without token returns BLOCKED token_missing', async () => {
    const res = await request(app).get('/ops/db-readonly-proof').expect(401);
    assert.equal(res.body.verdict, 'BLOCKED');
    assert.equal(res.body.blocked_reason, 'token_missing');
    assertSafeResponseBody(res.body);
  });

  it('GET with token but missing readonly URL returns BLOCKED', async () => {
    const res = await request(app)
      .get('/ops/db-readonly-proof')
      .set('Authorization', `Bearer ${OPS}`)
      .expect(503);
    assert.equal(res.body.verdict, 'BLOCKED');
    assert.equal(res.body.blocked_reason, 'readonly_url_missing');
    assert.equal(res.body.owner_database_url_fallback_used, false);
    assertSafeResponseBody(res.body);
  });
});
