import assert from 'node:assert/strict';
import { describe, it, before, after } from 'node:test';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';

import { createApp } from '../src/app.js';
import { AUTH_ERROR_CODE } from '../src/constants/authErrors.js';
import { env } from '../src/config/env.js';
import { prisma } from '../src/db.js';
import { isOwnerOnlyEnforced } from '../src/middleware/ownerOnlyAccessGuard.js';
import { signAccessToken } from '../src/services/authTokenService.js';
import { redactForReliabilityReport } from '../src/reliability/reliabilityHealthRedact.js';

describe('GET /api/admin/reliability/health', () => {
  const app = createApp();

  it('returns 401 without JWT', async () => {
    const res = await request(app).get('/api/admin/reliability/health');
    assert.equal(res.status, 401);
    assert.equal(res.body?.code, AUTH_ERROR_CODE.AUTH_REQUIRED);
  });

  it('staff JWT returns JSON without raw secrets (redaction helper)', () => {
    const body = redactForReliabilityReport({
      ok: true,
      stripeSecretKey: 'sk_live_xyz',
      nested: { userEmail: 'a@b.com' },
      recentFailures: [{ token: 'x', orderIdSuffix: 'short' }],
    });
    assert.equal(body.stripeSecretKey, '[redacted]');
    assert.equal(body.nested.userEmail, '[redacted]');
    assert.equal(body.recentFailures[0].token, '[redacted]');
  });
});

describe('GET /api/admin/reliability/health (with DB user)', () => {
  const app = createApp();
  /** @type {string | undefined} */
  let userId;
  /** @type {string | undefined} */
  let token;
  /** @type {boolean} */
  let deleteAfter;

  before(async () => {
    const email = isOwnerOnlyEnforced()
      ? String(env.ownerAllowedEmail ?? '').trim().toLowerCase()
      : `l7_staff_${randomUUID()}@test.invalid`;
    deleteAfter = !isOwnerOnlyEnforced();
    let u = await prisma.user.findUnique({ where: { email } });
    if (!u) {
      u = await prisma.user.create({
        data: {
          email,
          passwordHash: await bcrypt.hash('x', 4),
          role: 'admin',
        },
      });
    } else if (u.role !== 'admin') {
      await prisma.user.update({
        where: { id: u.id },
        data: { role: 'admin' },
      });
      u = await prisma.user.findUnique({ where: { id: u.id } });
    }
    if (!u) throw new Error('reliability_health_test_user_missing');
    userId = u.id;
    token = signAccessToken({
      id: u.id,
      email: u.email,
      role: u.role,
      tokenVersion: u.tokenVersion,
      emailVerifiedAt: u.emailVerifiedAt,
    });
  });

  after(async () => {
    if (userId && deleteAfter)
      await prisma.user.deleteMany({ where: { id: userId } });
  });

  it('returns reliability payload for staff', async () => {
    const res = await request(app)
      .get('/api/admin/reliability/health')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.equal(typeof res.body?.ok, 'boolean');
    assert.ok(['info', 'warn', 'critical'].includes(res.body?.severity));
    assert.equal(typeof res.body?.dbReady, 'boolean');
    assert.ok(typeof res.body?.redisReady === 'string');
    assert.ok(typeof res.body?.queueReady === 'string');
    assert.ok(Array.isArray(res.body?.recentFailures));
    assert.ok(Array.isArray(res.body?.recoveryActions));
    const raw = JSON.stringify(res.body);
    assert.equal(raw.includes('@test.invalid'), false);
    assert.equal(raw.includes('sk_live'), false);
    assert.equal(raw.includes('Bearer'), false);
  });
});
