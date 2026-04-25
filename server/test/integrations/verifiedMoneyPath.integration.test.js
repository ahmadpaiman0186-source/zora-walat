/**
 * Email verification gates on user-scoped money routes (PostgreSQL + full app).
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';

import { AUTH_ERROR_CODE } from '../../src/constants/authErrors.js';
import { createApp } from '../../src/app.js';
import { signAccessToken } from '../../src/services/authTokenService.js';

if (process.env.CI === 'true' && !process.env.TEST_DATABASE_URL) {
  throw new Error('CI requires TEST_DATABASE_URL for verified money path tests');
}

const dbUrl = String(process.env.DATABASE_URL ?? '').trim();
const runIntegration = Boolean(dbUrl);

describe('verified money path (integration)', { skip: !runIntegration }, () => {
  /** @type {PrismaClient} */
  let prisma;
  /** @type {import('express').Express} */
  let app;
  /** @type {string[]} */
  const emails = [];

  before(async () => {
    prisma = new PrismaClient({ datasourceUrl: dbUrl });
    await prisma.$connect();
    app = createApp();
  });

  after(async () => {
    if (emails.length === 0) {
      await prisma.$disconnect();
      return;
    }
    const users = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);
    if (userIds.length > 0) {
      await prisma.fulfillmentAttempt.deleteMany({
        where: { order: { userId: { in: userIds } } },
      });
      await prisma.loyaltyPointsGrant.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.loyaltyLedger.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.referralRewardTransaction.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.referralLoyaltyBonus.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.paymentCheckout.deleteMany({
        where: { userId: { in: userIds } },
      });
    }
    await prisma.refreshToken.deleteMany({
      where: { user: { email: { in: emails } } },
    });
    await prisma.recipient.deleteMany({
      where: { user: { email: { in: emails } } },
    });
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await prisma.$disconnect();
  });

  /**
   * @param {{ verified: boolean }} opts
   */
  async function makeUser(opts) {
    const email = `vm_${opts.verified ? 'v' : 'u'}_${randomUUID()}@test.invalid`;
    const passwordHash = await bcrypt.hash('x', 4);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'user',
        isActive: true,
        emailVerifiedAt: opts.verified ? new Date() : null,
      },
    });
    emails.push(email);
    return { user, token: signAccessToken(user) };
  }

  function expectVerificationGate(res) {
    assert.equal(res.status, 403);
    assert.equal(res.body?.success, false);
    assert.equal(res.body?.code, AUTH_ERROR_CODE.AUTH_VERIFICATION_REQUIRED);
    assert.match(String(res.body?.message ?? ''), /verification/i);
  }

  it('denies unverified user on POST /create-checkout-session', async () => {
    const { token } = await makeUser({ verified: false });
    const res = await request(app)
      .post('/create-checkout-session')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', randomUUID())
      .set('Content-Type', 'application/json')
      .send({ senderCountry: 'US', amountUsdCents: 1000, packageId: 'mock_airtime_10' });

    expectVerificationGate(res);
  });

  it('does not apply verification gate before auth on checkout (401 without token)', async () => {
    const res = await request(app)
      .post('/create-checkout-session')
      .set('Content-Type', 'application/json')
      .send({ senderCountry: 'US', amountUsdCents: 1000, packageId: 'mock_airtime_10' });

    assert.equal(res.status, 401);
    assert.equal(res.body?.code, AUTH_ERROR_CODE.AUTH_REQUIRED);
  });

  it('verified user passes verification middleware on checkout (not 403)', async () => {
    const { token } = await makeUser({ verified: true });
    const res = await request(app)
      .post('/create-checkout-session')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', randomUUID())
      .set('Content-Type', 'application/json')
      .send({ senderCountry: 'US', amountUsdCents: 1000, packageId: 'mock_airtime_10' });

    assert.notEqual(res.status, 403);
  });

  it('allows unverified user on GET /api/wallet/balance', async () => {
    const { token } = await makeUser({ verified: false });
    const res = await request(app)
      .get('/api/wallet/balance')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(typeof res.body?.balance, 'number');
  });

  it('allows unverified user on POST /api/recharge/quote', async () => {
    const { token } = await makeUser({ verified: false });
    const res = await request(app)
      .post('/api/recharge/quote')
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json')
      .send({
        phone: '701234567',
        operator: 'roshan',
      });

    assert.equal(res.status, 200);
  });

  it('denies unverified user on POST /api/recharge/order', async () => {
    const { token } = await makeUser({ verified: false });
    const res = await request(app)
      .post('/api/recharge/order')
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json')
      .send({
        packageId: 'test_pkg',
        phone: '701234567',
        operator: 'roshan',
      });

    expectVerificationGate(res);
  });

  it('denies unverified user on POST /api/recharge/execute', async () => {
    const { token } = await makeUser({ verified: false });
    const res = await request(app)
      .post('/api/recharge/execute')
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json')
      .send({ orderId: 'chk_fake' });

    expectVerificationGate(res);
  });

  it('verified user is not blocked by verification on POST /api/recharge/order (not 403)', async () => {
    const { token } = await makeUser({ verified: true });
    const res = await request(app)
      .post('/api/recharge/order')
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json')
      .send({
        packageId: 'test_pkg',
        phone: '701234567',
        operator: 'roshan',
      });

    assert.notEqual(res.status, 403);
  });
});
