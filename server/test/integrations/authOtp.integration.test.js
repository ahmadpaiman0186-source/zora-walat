/**
 * OTP auth lifecycle integration tests (PostgreSQL-backed, email delivery stubbed).
 * Requires migrated PostgreSQL via DATABASE_URL / TEST_DATABASE_URL preload.
 */
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { after, afterEach, before, describe, it } from 'node:test';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

import { HttpError } from '../../src/lib/httpError.js';
import {
  cleanupStaleAuthOtpChallengesForTests,
  requestEmailOtp,
  verifyEmailOtp,
} from '../../src/services/authService.js';
import {
  getOpsMetricsSnapshot,
  resetOpsMetricsForTests,
} from '../../src/lib/opsMetrics.js';

if (process.env.CI === 'true' && !process.env.TEST_DATABASE_URL) {
  throw new Error('CI requires TEST_DATABASE_URL for OTP integration tests');
}

const dbUrl = String(process.env.DATABASE_URL ?? '').trim();
const runIntegration = Boolean(dbUrl);

describe('auth OTP lifecycle (integration)', { skip: !runIntegration }, () => {
  /** @type {PrismaClient} */
  let prisma;
  /** @type {string[]} */
  const emails = [];

  before(async () => {
    prisma = new PrismaClient({ datasourceUrl: dbUrl });
    await prisma.$connect();
  });

  after(async () => {
    if (!prisma) return;
    await prisma.$disconnect();
  });

  afterEach(async () => {
    if (!prisma) return;
    resetOpsMetricsForTests();
    for (const email of emails) {
      await prisma.authOtpChallenge.deleteMany({ where: { email } });
      await prisma.refreshToken.deleteMany({
        where: { user: { email } },
      });
      await prisma.user.deleteMany({ where: { email } });
    }
    emails.length = 0;
  });

  async function makeUser(prefix = 'otp-int') {
    const email = `${prefix}_${randomUUID()}@test.invalid`;
    const passwordHash = await bcrypt.hash('TempPass123!Temp', 4);
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'user',
        isActive: true,
      },
    });
    emails.push(email);
    return email;
  }

  async function readChallenge(email) {
    return prisma.authOtpChallenge.findUnique({ where: { email } });
  }

  function countMetric(name) {
    return getOpsMetricsSnapshot().counters[`auth_otp_${name}`] ?? 0;
  }

  it('enforces resend cooldown and per-email request cap', async () => {
    const email = await makeUser('otp-issue');
    /** @type {string[]} */
    const sentOtps = [];
    const sendOtp = async (_email, otp) => {
      sentOtps.push(otp);
    };

    const first = await requestEmailOtp({ email }, { sendOtp });
    assert.deepEqual(first, {
      ok: true,
      message: 'If the account is eligible, an OTP email will be sent.',
    });
    assert.equal(sentOtps.length, 1);

    const cooldown = await requestEmailOtp({ email }, { sendOtp });
    assert.equal(cooldown.ok, true);
    assert.equal(sentOtps.length, 1);
    assert.equal(countMetric('request_cooldown_total'), 1);

    await prisma.authOtpChallenge.update({
      where: { email },
      data: {
        resendAfter: new Date(Date.now() - 1000),
      },
    });

    await requestEmailOtp({ email }, { sendOtp });
    assert.equal(sentOtps.length, 2);

    await prisma.authOtpChallenge.update({
      where: { email },
      data: {
        resendAfter: new Date(Date.now() - 1000),
      },
    });

    await requestEmailOtp({ email }, { sendOtp });
    assert.equal(sentOtps.length, 3);
    assert.equal(countMetric('request_issued_total'), 3);

    await prisma.authOtpChallenge.update({
      where: { email },
      data: {
        resendAfter: new Date(Date.now() - 1000),
      },
    });

    const capped = await requestEmailOtp({ email }, { sendOtp });
    assert.equal(capped.ok, true);
    assert.equal(sentOtps.length, 3);
    assert.equal(countMetric('request_window_limit_total'), 1);
  });

  it('increments verify failures and locks after 5 failed attempts', async () => {
    const email = await makeUser('otp-lock');
    const otp = '654321';

    await prisma.authOtpChallenge.create({
      data: {
        email,
        otpHash: createHash('sha256').update(`${email}:${otp}`).digest('hex'),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        resendAfter: new Date(Date.now() + 60 * 1000),
        attemptsCount: 0,
        requestCount: 1,
      },
    });

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await assert.rejects(
        () => verifyEmailOtp({ email, otp: '000000' }),
        (error) => error instanceof HttpError && error.status === 401,
      );
      const challenge = await readChallenge(email);
      assert.equal(challenge?.attemptsCount, attempt);
      assert.equal(challenge?.lockedUntil ?? null, null);
    }

    await assert.rejects(
      () => verifyEmailOtp({ email, otp: '000000' }),
      (error) => error instanceof HttpError && error.status === 429,
    );

    const locked = await readChallenge(email);
    assert.equal(locked?.attemptsCount, 5);
    assert.ok(locked?.lockedUntil instanceof Date);
    assert.equal(countMetric('verify_mismatch_total'), 4);
    assert.equal(countMetric('verify_locked_after_failures_total'), 1);

    await assert.rejects(
      () => verifyEmailOtp({ email, otp }),
      (error) => error instanceof HttpError && error.status === 429,
    );
    assert.equal(countMetric('verify_locked_total'), 1);
  });

  it('supports successful verification and rejects replay after consume', async () => {
    const email = await makeUser('otp-success');
    const otp = '123456';

    await prisma.authOtpChallenge.create({
      data: {
        email,
        otpHash: createHash('sha256').update(`${email}:${otp}`).digest('hex'),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        resendAfter: new Date(Date.now() + 60 * 1000),
        attemptsCount: 0,
        requestCount: 1,
      },
    });

    const verified = await verifyEmailOtp({ email, otp });
    assert.equal(typeof verified.accessToken, 'string');
    assert.equal(typeof verified.refreshToken, 'string');
    assert.equal(verified.user.email, email);
    assert.equal(countMetric('verify_success_total'), 1);

    const challenge = await readChallenge(email);
    assert.equal(challenge, null);

    await assert.rejects(
      () => verifyEmailOtp({ email, otp }),
      (error) => error instanceof HttpError && error.status === 401,
    );
    assert.equal(countMetric('verify_missing_total'), 1);
  });

  it('rejects expired OTPs', async () => {
    const email = await makeUser('otp-expired');

    await prisma.authOtpChallenge.create({
      data: {
        email,
        otpHash: createHash('sha256').update(`${email}:111111`).digest('hex'),
        expiresAt: new Date(Date.now() - 60_000),
        resendAfter: new Date(Date.now() - 30_000),
        attemptsCount: 0,
        requestCount: 1,
      },
    });

    await assert.rejects(
      () => verifyEmailOtp({ email, otp: '111111' }),
      (error) => error instanceof HttpError && error.status === 401,
    );
    assert.equal(countMetric('verify_expired_total'), 1);
  });

  it('cleans up stale OTP challenges opportunistically', async () => {
    const email = await makeUser('otp-cleanup');
    const staleConsumedEmail = `otp_cleanup_consumed_${randomUUID()}@test.invalid`;
    emails.push(staleConsumedEmail);

    await prisma.user.create({
      data: {
        email: staleConsumedEmail,
        passwordHash: await bcrypt.hash('TempPass123!Temp', 4),
        role: 'user',
        isActive: true,
      },
    });

    const now = new Date();
    const staleAt = new Date(now.getTime() - 25 * 60 * 60 * 1000);

    await prisma.authOtpChallenge.create({
      data: {
        email,
        otpHash: createHash('sha256').update(`${email}:222222`).digest('hex'),
        expiresAt: staleAt,
        resendAfter: staleAt,
        attemptsCount: 0,
        requestCount: 1,
        lastSentAt: staleAt,
        createdAt: staleAt,
      },
    });

    await prisma.authOtpChallenge.create({
      data: {
        email: staleConsumedEmail,
        otpHash: createHash('sha256')
          .update(`${staleConsumedEmail}:333333`)
          .digest('hex'),
        expiresAt: new Date(now.getTime() + 5 * 60 * 1000),
        resendAfter: new Date(now.getTime() - 60 * 1000),
        attemptsCount: 0,
        requestCount: 1,
        consumedAt: staleAt,
        lastSentAt: staleAt,
        createdAt: staleAt,
      },
    });

    await cleanupStaleAuthOtpChallengesForTests(now);

    assert.equal(await readChallenge(email), null);
    assert.equal(await readChallenge(staleConsumedEmail), null);
    assert.equal(countMetric('cleanup_deleted_total'), 2);
  });
});
