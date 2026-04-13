import bcrypt from 'bcrypt';
import { createHash, randomInt, randomUUID } from 'node:crypto';

import { prisma } from '../db.js';
import { HttpError } from '../lib/httpError.js';
import { bumpCounter } from '../lib/opsMetrics.js';
import {
  generateRefreshTokenRaw,
  refreshTokenStorageHash,
} from '../lib/authCrypto.js';
import { signAccessToken } from './authTokenService.js';
import { env } from '../config/env.js';
import { AUTH_ERROR_CODE } from '../constants/authErrors.js';
import { ensureUserReferralCode } from './referral/referralCodeService.js';

const BCRYPT_ROUNDS = 12;
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_REQUEST_WINDOW_MS = 10 * 60 * 1000;
const OTP_MAX_REQUESTS_PER_WINDOW = 3;
const OTP_MAX_VERIFY_ATTEMPTS = 5;
const OTP_LOCK_MS = 10 * 60 * 1000;
const OTP_STALE_RETENTION_MS = 24 * 60 * 60 * 1000;

function normalizeEmailIdentity(email) {
  return String(email ?? '').trim().toLowerCase();
}

function redactEmailForLogs(email) {
  return createHash('sha256')
    .update(normalizeEmailIdentity(email))
    .digest('hex')
    .slice(0, 16);
}

function logOtpEvent(level, event, fields = {}) {
  const entry = {
    t: new Date().toISOString(),
    level,
    subsystem: 'auth_otp',
    event,
    ...fields,
  };
  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
    return;
  }
  if (level === 'warn') {
    console.warn(line);
    return;
  }
  console.log(line);
}

let cleanupInFlight = null;

function recordOtpCounter(name, delta = 1) {
  bumpCounter(`auth_otp_${name}`, delta);
}

async function cleanupExpiredOtpChallenges(now = new Date()) {
  const threshold = new Date(now.getTime() - OTP_STALE_RETENTION_MS);
  const result = await prisma.authOtpChallenge.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: threshold } },
        {
          consumedAt: {
            not: null,
            lt: threshold,
          },
        },
      ],
    },
  });
  if (result.count > 0) {
    recordOtpCounter('cleanup_deleted_total', result.count);
    logOtpEvent('info', 'otp_cleanup_deleted', { deletedCount: result.count });
  }
}

function scheduleOtpCleanup(now = new Date()) {
  if (cleanupInFlight) return cleanupInFlight;
  cleanupInFlight = cleanupExpiredOtpChallenges(now)
    .catch((error) => {
      recordOtpCounter('cleanup_failed_total');
      logOtpEvent('warn', 'otp_cleanup_failed', {
        errorCode: error?.code ?? 'unknown',
      });
    })
    .finally(() => {
      cleanupInFlight = null;
    });
  return cleanupInFlight;
}

function otpHashFor(email, otp) {
  return createHash('sha256')
    .update(`${normalizeEmailIdentity(email)}:${String(otp ?? '').trim()}`)
    .digest('hex');
}

function generateOtpCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

function publicOtpResponse() {
  return {
    ok: true,
    message: 'If the account is eligible, an OTP email will be sent.',
  };
}

export async function registerUser({ email, password }) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  try {
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        role: 'user',
      },
    });
    await ensureUserReferralCode(user.id);
    const tokens = await issueTokenPair(user);
    return {
      ...tokens,
      user: { id: user.id, email: user.email, role: user.role },
    };
  } catch (e) {
    if (e?.code === 'P2002') {
      throw new HttpError(409, 'Account already exists', {
        code: AUTH_ERROR_CODE.AUTH_EMAIL_EXISTS,
      });
    }
    throw e;
  }
}

export async function loginUser({ email, password }) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!user || !user.isActive) {
    throw new HttpError(401, 'Authentication required', {
      code: AUTH_ERROR_CODE.AUTH_INVALID_CREDENTIALS,
    });
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    throw new HttpError(401, 'Authentication required', {
      code: AUTH_ERROR_CODE.AUTH_INVALID_CREDENTIALS,
    });
  }
  const tokens = await issueTokenPair(user);
  return {
    ...tokens,
    user: { id: user.id, email: user.email, role: user.role },
  };
}

async function issueTokenPairWithTx(tx, user) {
  const accessToken = signAccessToken(user);
  const rawRefresh = generateRefreshTokenRaw();
  const tokenHash = refreshTokenStorageHash(rawRefresh);
  const familyId = randomUUID();
  const expiresAt = new Date(
    Date.now() + env.refreshTokenTtlSec * 1000,
  );
  await tx.refreshToken.create({
    data: {
      tokenHash,
      userId: user.id,
      familyId,
      expiresAt,
    },
  });
  return {
    accessToken,
    refreshToken: rawRefresh,
    expiresIn: env.accessTokenTtlSec,
    tokenType: 'Bearer',
  };
}

async function issueTokenPair(user) {
  return issueTokenPairWithTx(prisma, user);
}

export async function issueTokenPairForUser(user) {
  return issueTokenPair(user);
}

export async function requestEmailOtp({ email }, { sendOtp }) {
  const normalizedEmail = normalizeEmailIdentity(email);
  const emailHash = redactEmailForLogs(normalizedEmail);
  const now = new Date();
  void scheduleOtpCleanup(now);
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, email: true, isActive: true },
  });

  if (!existingUser || !existingUser.isActive) {
    recordOtpCounter('request_unknown_identity_total');
    logOtpEvent('info', 'otp_request_ignored_unknown_identity', { emailHash });
    return publicOtpResponse();
  }

  const challenge = await prisma.authOtpChallenge.findUnique({
    where: { email: normalizedEmail },
  });

  if (challenge?.lockedUntil && challenge.lockedUntil > now) {
    recordOtpCounter('request_locked_total');
    logOtpEvent('warn', 'otp_request_locked', { emailHash });
    return publicOtpResponse();
  }

  if (
    challenge &&
    challenge.createdAt > new Date(now.getTime() - OTP_REQUEST_WINDOW_MS) &&
    challenge.requestCount >= OTP_MAX_REQUESTS_PER_WINDOW
  ) {
    recordOtpCounter('request_window_limit_total');
    logOtpEvent('warn', 'otp_request_window_limit', { emailHash });
    return publicOtpResponse();
  }

  if (challenge?.resendAfter && challenge.resendAfter > now) {
    recordOtpCounter('request_cooldown_total');
    logOtpEvent('warn', 'otp_request_cooldown', { emailHash });
    return publicOtpResponse();
  }

  const otp = generateOtpCode();
  const otpHash = otpHashFor(normalizedEmail, otp);
  const expiresAt = new Date(now.getTime() + OTP_TTL_MS);
  const resendAfter = new Date(now.getTime() + OTP_RESEND_COOLDOWN_MS);

  await prisma.authOtpChallenge.upsert({
    where: { email: normalizedEmail },
    update: {
      otpHash,
      expiresAt,
      resendAfter,
      attemptsCount: 0,
      requestCount:
        challenge && challenge.createdAt > new Date(now.getTime() - OTP_REQUEST_WINDOW_MS)
          ? challenge.requestCount + 1
          : 1,
      lockedUntil: null,
      consumedAt: null,
      lastSentAt: now,
      createdAt:
        challenge && challenge.createdAt > new Date(now.getTime() - OTP_REQUEST_WINDOW_MS)
          ? challenge.createdAt
          : now,
    },
    create: {
      email: normalizedEmail,
      otpHash,
      expiresAt,
      resendAfter,
      attemptsCount: 0,
      requestCount: 1,
      lastSentAt: now,
    },
  });

  try {
    await sendOtp(normalizedEmail, otp);
  } catch (error) {
    await prisma.authOtpChallenge.deleteMany({
      where: {
        email: normalizedEmail,
        otpHash,
      },
    });
    recordOtpCounter('request_delivery_failed_total');
    logOtpEvent('error', 'otp_request_delivery_failed', {
      emailHash,
      errorCode: error?.code ?? 'unknown',
    });
    return publicOtpResponse();
  }

  recordOtpCounter('request_issued_total');
  logOtpEvent('info', 'otp_request_issued', {
    emailHash,
    expiresInMs: OTP_TTL_MS,
  });
  return publicOtpResponse();
}

export async function verifyEmailOtp({ email, otp }) {
  const normalizedEmail = normalizeEmailIdentity(email);
  const emailHash = redactEmailForLogs(normalizedEmail);
  const now = new Date();
  void scheduleOtpCleanup(now);
  const challenge = await prisma.authOtpChallenge.findUnique({
    where: { email: normalizedEmail },
  });

  if (!challenge) {
    recordOtpCounter('verify_missing_total');
    logOtpEvent('warn', 'otp_verify_missing', { emailHash });
    throw new HttpError(401, 'Authentication required', {
      code: AUTH_ERROR_CODE.AUTH_INVALID_CREDENTIALS,
    });
  }
  if (challenge.consumedAt) {
    recordOtpCounter('verify_consumed_total');
    logOtpEvent('warn', 'otp_verify_consumed', { emailHash });
    throw new HttpError(401, 'Authentication required', {
      code: AUTH_ERROR_CODE.AUTH_INVALID_CREDENTIALS,
    });
  }
  if (challenge.lockedUntil && challenge.lockedUntil > now) {
    recordOtpCounter('verify_locked_total');
    logOtpEvent('warn', 'otp_verify_locked', { emailHash });
    throw new HttpError(429, 'Too many attempts; try again later.', {
      code: AUTH_ERROR_CODE.AUTH_OTP_LOCKED,
    });
  }
  if (challenge.expiresAt <= now) {
    recordOtpCounter('verify_expired_total');
    logOtpEvent('warn', 'otp_verify_expired', { emailHash });
    throw new HttpError(401, 'Authentication required', {
      code: AUTH_ERROR_CODE.AUTH_INVALID_CREDENTIALS,
    });
  }

  const providedHash = otpHashFor(normalizedEmail, otp);
  if (providedHash !== challenge.otpHash) {
    const nextAttempts = challenge.attemptsCount + 1;
    await prisma.authOtpChallenge.update({
      where: { email: normalizedEmail },
      data: {
        attemptsCount: nextAttempts,
        lockedUntil:
          nextAttempts >= OTP_MAX_VERIFY_ATTEMPTS
            ? new Date(now.getTime() + OTP_LOCK_MS)
            : null,
      },
    });
    if (nextAttempts >= OTP_MAX_VERIFY_ATTEMPTS) {
      recordOtpCounter('verify_locked_after_failures_total');
      logOtpEvent('warn', 'otp_verify_locked_after_failures', {
        emailHash,
        attemptsCount: nextAttempts,
      });
      throw new HttpError(429, 'Too many attempts; try again later.', {
        code: AUTH_ERROR_CODE.AUTH_OTP_LOCKED,
      });
    }
    recordOtpCounter('verify_mismatch_total');
    logOtpEvent('warn', 'otp_verify_mismatch', {
      emailHash,
      attemptsCount: nextAttempts,
    });
    throw new HttpError(401, 'Authentication required', {
      code: AUTH_ERROR_CODE.AUTH_INVALID_CREDENTIALS,
    });
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (!user || !user.isActive) {
    logOtpEvent('warn', 'otp_verify_missing_user', { emailHash });
    throw new HttpError(401, 'Authentication required', {
      code: AUTH_ERROR_CODE.AUTH_INVALID_CREDENTIALS,
    });
  }

  const tokens = await prisma.$transaction(async (tx) => {
    await tx.authOtpChallenge.delete({
      where: { email: normalizedEmail },
    });
    return issueTokenPairWithTx(tx, user);
  });

  recordOtpCounter('verify_success_total');
  logOtpEvent('info', 'otp_verify_success', { emailHash });

  return {
    ...tokens,
    user: { id: user.id, email: user.email, role: user.role },
  };
}

export async function refreshSession(rawRefresh) {
  const tokenHash = refreshTokenStorageHash(rawRefresh);
  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (
    !existing ||
    existing.revokedAt ||
    existing.expiresAt < new Date()
  ) {
    throw new HttpError(401, 'Authentication required', {
      code: AUTH_ERROR_CODE.AUTH_REFRESH_INVALID,
    });
  }
  const user = existing.user;
  if (!user.isActive) {
    throw new HttpError(401, 'Authentication required', {
      code: AUTH_ERROR_CODE.AUTH_REFRESH_INVALID,
    });
  }

  const rawNew = generateRefreshTokenRaw();
  const newHash = refreshTokenStorageHash(rawNew);
  const expiresAt = new Date(
    Date.now() + env.refreshTokenTtlSec * 1000,
  );

  await prisma.$transaction(async (tx) => {
    const revoked = await tx.refreshToken.updateMany({
      where: { id: existing.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (revoked.count === 0) {
      throw new HttpError(401, 'Authentication required', {
        code: AUTH_ERROR_CODE.AUTH_REFRESH_INVALID,
      });
    }
    await tx.refreshToken.create({
      data: {
        tokenHash: newHash,
        userId: user.id,
        familyId: existing.familyId,
        expiresAt,
      },
    });
  });

  const accessToken = signAccessToken(user);
  return {
    accessToken,
    refreshToken: rawNew,
    expiresIn: env.accessTokenTtlSec,
    tokenType: 'Bearer',
  };
}

export async function logoutRefreshToken(rawRefresh) {
  if (!rawRefresh) {
    throw new HttpError(400, 'Invalid request', {
      code: AUTH_ERROR_CODE.AUTH_INVALID_REQUEST,
    });
  }
  const tokenHash = refreshTokenStorageHash(rawRefresh);
  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash },
  });
  if (existing && !existing.revokedAt) {
    await prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });
  }
  return { ok: true };
}

export async function loadUserForRequest(userId, tokenVersion) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive || user.tokenVersion !== tokenVersion) {
    return null;
  }
  return user;
}

export async function cleanupStaleAuthOtpChallengesForTests(now = new Date()) {
  await cleanupExpiredOtpChallenges(now);
}
