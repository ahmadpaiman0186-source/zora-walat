/**
 * HTTP contract: register → OTP challenge → verify → wallet read (money-adjacent, read-only).
 * OTP challenge is seeded in DB (same hash algorithm as production) so no email transport is required.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';

import { AUTH_ERROR_CODE } from '../../src/constants/authErrors.js';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { otpHashFor } from '../../src/services/identity/otpChallengeService.js';

if (process.env.CI === 'true' && !process.env.TEST_DATABASE_URL) {
  throw new Error('CI requires TEST_DATABASE_URL for API contract auth flow tests');
}

const dbUrl = String(process.env.DATABASE_URL ?? '').trim();
const runIntegration = Boolean(dbUrl);

describe(
  'API contract auth flow (integration)',
  { skip: !runIntegration },
  () => {
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
      for (const email of emails) {
        await prisma.authOtpChallenge.deleteMany({ where: { email } });
        await prisma.refreshToken.deleteMany({
          where: { user: { email } },
        });
        await prisma.user.deleteMany({ where: { email } });
      }
      await prisma.$disconnect();
    });

    it('signup → verify-otp → GET /api/wallet/balance returns contract-compliant JSON', async () => {
      const password = 'ContractTest1!Contract';
      const email = `api_contract_${randomUUID()}@test.invalid`;
      emails.push(email);

      const reg = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send({ email, password });

      assert.equal(reg.status, 201, JSON.stringify(reg.body));
      assert.equal(reg.body?.user?.emailVerified, false);

      const now = new Date();
      const otp = '424242';
      const expiresAt = new Date(now.getTime() + env.authOtpTtlSec * 1000);
      const resendAfter = new Date(now.getTime() - 60_000);
      await prisma.authOtpChallenge.upsert({
        where: { email },
        create: {
          email,
          otpHash: otpHashFor(email, otp),
          expiresAt,
          resendAfter,
          attemptsCount: 0,
          requestCount: 1,
          lastSentAt: now,
        },
        update: {
          otpHash: otpHashFor(email, otp),
          expiresAt,
          resendAfter,
          attemptsCount: 0,
          consumedAt: null,
          lockedUntil: null,
        },
      });

      const ver = await request(app)
        .post('/api/auth/verify-otp')
        .set('Content-Type', 'application/json')
        .send({ email, otp });

      assert.equal(ver.status, 200, JSON.stringify(ver.body));
      assert.equal(ver.body?.user?.emailVerified, true);
      assert.ok(
        typeof ver.body?.accessToken === 'string' && ver.body.accessToken.length > 10,
      );

      const bal = await request(app)
        .get('/api/wallet/balance')
        .set('Authorization', `Bearer ${ver.body.accessToken}`);

      assert.equal(bal.status, 200);
      assert.equal(typeof bal.body?.balance, 'number');
    });

    it('invalid OTP returns auth_otp_invalid with normalized error body', async () => {
      const password = 'ContractTest2!Contract';
      const email = `api_contract_bad_${randomUUID()}@test.invalid`;
      emails.push(email);

      await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send({ email, password });

      const now = new Date();
      const otp = '111111';
      const expiresAt = new Date(now.getTime() + env.authOtpTtlSec * 1000);
      const resendAfter = new Date(now.getTime() - 60_000);
      await prisma.authOtpChallenge.upsert({
        where: { email },
        create: {
          email,
          otpHash: otpHashFor(email, otp),
          expiresAt,
          resendAfter,
          attemptsCount: 0,
          requestCount: 1,
          lastSentAt: now,
        },
        update: {
          otpHash: otpHashFor(email, otp),
          expiresAt,
          resendAfter,
          attemptsCount: 0,
          consumedAt: null,
          lockedUntil: null,
        },
      });

      const bad = await request(app)
        .post('/api/auth/verify-otp')
        .set('Content-Type', 'application/json')
        .send({ email, otp: '000000' });

      assert.equal(bad.status, 401);
      assert.equal(bad.body?.success, false);
      assert.equal(bad.body?.code, AUTH_ERROR_CODE.AUTH_OTP_INVALID);
      assert.equal(bad.body?.error, bad.body?.message);
    });
  },
);
