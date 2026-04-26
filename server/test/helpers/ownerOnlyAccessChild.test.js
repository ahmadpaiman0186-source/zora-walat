/**
 * Subprocess-only: `OWNER_ALLOWED_EMAIL` must be set before `env.js` loads (see parent test).
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';

import { OWNER_ONLY_DENY_CODE } from '../../src/middleware/ownerOnlyAccessGuard.js';

const OWNER = 'ahmadpaimaiman0186@gmail.com';

const { createApp } = await import('../../src/app.js');
const { issueTokenPairForUser } = await import('../../src/services/authService.js');

const app = createApp();
const dbUrl = String(process.env.DATABASE_URL ?? '').trim();
const hasDb = Boolean(dbUrl);

describe('owner-only access (child process)', () => {
  /** @type {PrismaClient | null} */
  let prisma = null;

  before(async () => {
    if (hasDb) {
      prisma = new PrismaClient({ datasourceUrl: dbUrl });
      await prisma.$connect();
    }
  });

  after(async () => {
    if (prisma) await prisma.$disconnect();
  });

  it('403 register / login / OTP routes for non-owner email (no tokens)', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send({ email: 'intruder@example.com', password: '123456789012' });
    assert.equal(reg.status, 403);
    assert.equal(reg.body?.code, OWNER_ONLY_DENY_CODE);
    assert.ok(!reg.body?.accessToken);

    const login = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send({ email: 'intruder@example.com', password: 'whatever' });
    assert.equal(login.status, 403);
    assert.equal(login.body?.code, OWNER_ONLY_DENY_CODE);

    const otp = await request(app)
      .post('/api/auth/request-otp')
      .set('Content-Type', 'application/json')
      .send({ email: 'other@example.com' });
    assert.equal(otp.status, 403);
    assert.equal(otp.body?.code, OWNER_ONLY_DENY_CODE);

    const ver = await request(app)
      .post('/api/auth/verify-otp')
      .set('Content-Type', 'application/json')
      .send({ email: 'other@example.com', otp: '000000' });
    assert.equal(ver.status, 403);
    assert.equal(ver.body?.code, OWNER_ONLY_DENY_CODE);
  });

  it(
    'register succeeds for owner email when DB available',
    { skip: !hasDb },
    async () => {
      await prisma.user.deleteMany({ where: { email: OWNER } });
    const reg = await request(app)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send({ email: OWNER, password: 'OwnerOnly123!Owner' });
    assert.equal(reg.status, 201, JSON.stringify(reg.body));
    assert.equal(reg.body?.user?.email, OWNER);
    assert.ok(typeof reg.body?.accessToken === 'string');
    await prisma.user.deleteMany({ where: { email: OWNER } });
    },
  );

  it(
    '403 refresh and logout for non-owner refresh token when DB available',
    { skip: !hasDb },
    async () => {
    const email = `other_owner_test_${Date.now()}@test.invalid`;
    const passwordHash = await bcrypt.hash('123456789012', 12);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'user',
        tokenVersion: 0,
      },
    });
    const pair = await issueTokenPairForUser(user);
    const ref = await request(app)
      .post('/api/auth/refresh')
      .set('Content-Type', 'application/json')
      .send({ refreshToken: pair.refreshToken });
    assert.equal(ref.status, 403);
    assert.equal(ref.body?.code, OWNER_ONLY_DENY_CODE);
    assert.ok(!ref.body?.accessToken);

    const pair2 = await issueTokenPairForUser(user);
    const out = await request(app)
      .post('/api/auth/logout')
      .set('Content-Type', 'application/json')
      .send({ refreshToken: pair2.refreshToken });
    assert.equal(out.status, 403);
    assert.equal(out.body?.code, OWNER_ONLY_DENY_CODE);

    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    },
  );

  it(
    '403 protected API with non-owner JWT when DB available',
    { skip: !hasDb },
    async () => {
    const email = `jwt_owner_test_${Date.now()}@test.invalid`;
    const passwordHash = await bcrypt.hash('123456789012', 12);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'user',
        tokenVersion: 0,
      },
    });
    const pair = await issueTokenPairForUser(user);
    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${pair.accessToken}`);
    assert.equal(me.status, 403);
    assert.equal(me.body?.code, OWNER_ONLY_DENY_CODE);

    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    },
  );
});
