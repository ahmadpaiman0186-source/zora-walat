import bcrypt from 'bcrypt';
import { prisma } from '../db.js';
import { HttpError } from '../lib/httpError.js';
import {
  generateRefreshTokenRaw,
  refreshTokenStorageHash,
} from '../lib/authCrypto.js';
import { signAccessToken } from './authTokenService.js';
import { issueTokenPairWithTx } from './sessionIssuance.js';
import { env } from '../config/env.js';
import { AUTH_ERROR_CODE } from '../constants/authErrors.js';
import { ensureUserReferralCode } from './referral/referralCodeService.js';

const BCRYPT_ROUNDS = 12;

/**
 * @param {{ id: string; email: string; role: string; emailVerifiedAt?: Date | null }} user
 */
export function userAuthDto(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    emailVerified: Boolean(user.emailVerifiedAt),
  };
}

async function issueTokenPair(user) {
  return issueTokenPairWithTx(prisma, user);
}

export async function issueTokenPairForUser(user) {
  return issueTokenPair(user);
}

export async function registerUser({ email, password }) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  try {
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        role: 'user',
        emailVerifiedAt: null,
      },
    });
    await ensureUserReferralCode(user.id);
    const tokens = await issueTokenPair(user);
    return {
      ...tokens,
      user: userAuthDto(user),
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
    user: userAuthDto(user),
  };
}

export async function refreshSession(rawRefresh) {
  const tokenHash = refreshTokenStorageHash(rawRefresh);
  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
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
  const expiresAt = new Date(Date.now() + env.refreshTokenTtlSec * 1000);

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
    success: true,
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
  return { success: true, ok: true };
}

export async function loadUserForRequest(userId, tokenVersion) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive || user.tokenVersion !== tokenVersion) {
    return null;
  }
  return user;
}

export {
  requestEmailOtp,
  verifyEmailOtp,
  cleanupStaleAuthOtpChallengesForTests,
} from './identity/otpChallengeService.js';
