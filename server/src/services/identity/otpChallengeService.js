import { createHash, randomInt } from 'node:crypto';

import { prisma } from '../../db.js';
import { HttpError } from '../../lib/httpError.js';
import { bumpCounter } from '../../lib/opsMetrics.js';
import { issueTokenPairWithTx } from '../sessionIssuance.js';
import { env } from '../../config/env.js';
import { AUTH_ERROR_CODE } from '../../constants/authErrors.js';
import { RISK_REASON_CODE } from '../../constants/riskErrors.js';
import { evaluateRisk } from '../risk/riskEngine.js';
import { incrementSlidingWindow } from '../risk/riskSlidingWindow.js';

/** Stored after successful verify — never matches a real SHA-256 hex of a user OTP. */
export const CONSUMED_OTP_HASH_SENTINEL =
  '__consumed_v1______________________________________________';

function otpTtlMs() {
  return env.authOtpTtlSec * 1000;
}
function otpResendCooldownMs() {
  return env.authOtpResendCooldownSec * 1000;
}
function otpRequestWindowMs() {
  return env.authOtpRequestWindowSec * 1000;
}
function otpLockMs() {
  return env.authOtpLockSec * 1000;
}
function otpStaleRetentionMs() {
  return env.authOtpStaleRetentionSec * 1000;
}

export function normalizeEmailIdentity(email) {
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

export function otpHashFor(email, otp) {
  return createHash('sha256')
    .update(`${normalizeEmailIdentity(email)}:${String(otp ?? '').trim()}`)
    .digest('hex');
}

export function generateOtpCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

function publicOtpResponse() {
  return {
    success: true,
    ok: true,
    message: 'If the account is eligible, an OTP email will be sent.',
  };
}

async function cleanupExpiredOtpChallenges(now = new Date()) {
  const threshold = new Date(now.getTime() - otpStaleRetentionMs());
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

/** Sliding-window caps (per process) layered on DB limits. */
const OTP_EMAIL_WINDOW_MS = 60 * 60 * 1000;
const OTP_EMAIL_WINDOW_MAX = 24;
const OTP_IP_WINDOW_MAX = 72;

/**
 * @param {{ email: string }} params
 * @param {{ sendOtp: (email: string, otp: string) => Promise<void>, clientIpKey?: string }} deps
 */
export async function requestEmailOtp({ email }, { sendOtp, clientIpKey }) {
  const normalizedEmail = normalizeEmailIdentity(email);
  const emailHash = redactEmailForLogs(normalizedEmail);
  const ipKey = clientIpKey ?? 'unknown';
  const now = new Date();
  void scheduleOtpCleanup(now);

  const emailSw = incrementSlidingWindow(`otp_req_sw_email:${emailHash}`, OTP_EMAIL_WINDOW_MS);
  const ipSw = incrementSlidingWindow(`otp_req_sw_ip:${ipKey}`, OTP_EMAIL_WINDOW_MS);
  const reqEv = evaluateRisk({
    kind: 'otp_request',
    flags: {
      otpEmailVelocityExceeded: emailSw.count > OTP_EMAIL_WINDOW_MAX,
      otpIpVelocityExceeded: ipSw.count > OTP_IP_WINDOW_MAX,
    },
  });
  if (reqEv.decision === 'deny') {
    recordOtpCounter('request_sw_denied_total');
    logOtpEvent('warn', 'otp_request_sliding_window_denied', {
      emailHash,
      reasonCode: reqEv.reasonCode,
    });
    throw new HttpError(
      429,
      'Too many verification requests; try again later.',
      { code: reqEv.reasonCode },
    );
  }

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
    throw new HttpError(
      429,
      'Too many attempts; try again later.',
      { code: RISK_REASON_CODE.OTP_ABUSE },
    );
  }

  if (
    challenge &&
    challenge.createdAt > new Date(now.getTime() - otpRequestWindowMs()) &&
    challenge.requestCount >= env.authOtpMaxRequestsPerWindow
  ) {
    recordOtpCounter('request_window_limit_total');
    logOtpEvent('warn', 'otp_request_window_limit', { emailHash });
    throw new HttpError(
      429,
      'Too many verification requests for this email; try again later.',
      { code: RISK_REASON_CODE.OTP_ABUSE },
    );
  }

  if (challenge?.resendAfter && challenge.resendAfter > now) {
    recordOtpCounter('request_cooldown_total');
    logOtpEvent('warn', 'otp_request_cooldown', { emailHash });
    throw new HttpError(
      429,
      'Please wait before requesting another code.',
      { code: RISK_REASON_CODE.RATE_LIMITED },
    );
  }

  const otp = generateOtpCode();
  const otpHash = otpHashFor(normalizedEmail, otp);
  const expiresAt = new Date(now.getTime() + otpTtlMs());
  const resendAfter = new Date(now.getTime() + otpResendCooldownMs());

  await prisma.authOtpChallenge.upsert({
    where: { email: normalizedEmail },
    update: {
      otpHash,
      expiresAt,
      resendAfter,
      attemptsCount: 0,
      consumedAt: null,
      requestCount:
        challenge && challenge.createdAt > new Date(now.getTime() - otpRequestWindowMs())
          ? challenge.requestCount + 1
          : 1,
      lockedUntil: null,
      lastSentAt: now,
      createdAt:
        challenge && challenge.createdAt > new Date(now.getTime() - otpRequestWindowMs())
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
    expiresInMs: otpTtlMs(),
  });
  return publicOtpResponse();
}

const OTP_VERIFY_IP_WINDOW_MS = 60 * 60 * 1000;
const OTP_VERIFY_IP_WINDOW_MAX = 180;

/**
 * @param {{ email: string, otp: string }} params
 * @param {{ clientIpKey?: string }} [opts]
 */
export async function verifyEmailOtp({ email, otp }, opts = {}) {
  const normalizedEmail = normalizeEmailIdentity(email);
  const emailHash = redactEmailForLogs(normalizedEmail);
  const ipKey = opts.clientIpKey ?? 'unknown';
  const verifySw = incrementSlidingWindow(
    `otp_verify_sw_ip:${ipKey}`,
    OTP_VERIFY_IP_WINDOW_MS,
  );
  const vEv = evaluateRisk({
    kind: 'otp_verify',
    flags: {
      otpVerifyFailuresBurst: verifySw.count > OTP_VERIFY_IP_WINDOW_MAX,
    },
  });
  if (vEv.decision === 'deny') {
    recordOtpCounter('verify_sw_denied_total');
    logOtpEvent('warn', 'otp_verify_sliding_window_denied', {
      emailHash,
      reasonCode: vEv.reasonCode,
    });
    throw new HttpError(
      429,
      'Too many verification attempts; try again later.',
      { code: vEv.reasonCode },
    );
  }

  const now = new Date();
  void scheduleOtpCleanup(now);
  const challenge = await prisma.authOtpChallenge.findUnique({
    where: { email: normalizedEmail },
  });

  if (!challenge) {
    recordOtpCounter('verify_missing_total');
    logOtpEvent('warn', 'otp_verify_missing', { emailHash });
    throw new HttpError(401, 'No active verification code for this email.', {
      code: AUTH_ERROR_CODE.AUTH_OTP_NOT_FOUND,
    });
  }

  if (challenge.consumedAt) {
    recordOtpCounter('verify_consumed_total');
    logOtpEvent('warn', 'otp_verify_consumed', { emailHash });
    throw new HttpError(401, 'This verification code was already used.', {
      code: AUTH_ERROR_CODE.AUTH_OTP_REPLAY,
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
    throw new HttpError(401, 'Verification code expired.', {
      code: AUTH_ERROR_CODE.AUTH_OTP_EXPIRED,
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
          nextAttempts >= env.authOtpMaxVerifyAttempts
            ? new Date(now.getTime() + otpLockMs())
            : null,
      },
    });
    if (nextAttempts >= env.authOtpMaxVerifyAttempts) {
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
    throw new HttpError(401, 'Invalid verification code.', {
      code: AUTH_ERROR_CODE.AUTH_OTP_INVALID,
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

  const verifiedAt = now;
  const tokens = await prisma.$transaction(async (tx) => {
    await tx.authOtpChallenge.update({
      where: { email: normalizedEmail },
      data: {
        consumedAt: verifiedAt,
        otpHash: CONSUMED_OTP_HASH_SENTINEL,
        lockedUntil: null,
      },
    });
    await tx.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: user.emailVerifiedAt ?? verifiedAt },
    });
    const updatedUser = await tx.user.findUnique({ where: { id: user.id } });
    if (!updatedUser) {
      throw new HttpError(500, 'Internal server error');
    }
    return issueTokenPairWithTx(tx, updatedUser);
  });

  recordOtpCounter('verify_success_total');
  logOtpEvent('info', 'otp_verify_success', { emailHash });

  return {
    ...tokens,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      emailVerified: true,
    },
  };
}

export async function cleanupStaleAuthOtpChallengesForTests(now = new Date()) {
  await cleanupExpiredOtpChallenges(now);
}
