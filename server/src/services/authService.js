import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';

import { prisma } from '../db.js';
import { HttpError } from '../lib/httpError.js';
import {
  generateRefreshTokenRaw,
  refreshTokenStorageHash,
} from '../lib/authCrypto.js';
import { signAccessToken } from './authTokenService.js';
import { env } from '../config/env.js';

const BCRYPT_ROUNDS = 12;

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
    const tokens = await issueTokenPair(user);
    return {
      ...tokens,
      user: { id: user.id, email: user.email, role: user.role },
    };
  } catch (e) {
    if (e?.code === 'P2002') {
      throw new HttpError(400, 'Invalid request');
    }
    throw e;
  }
}

export async function loginUser({ email, password }) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!user || !user.isActive) {
    throw new HttpError(401, 'Authentication required');
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    throw new HttpError(401, 'Authentication required');
  }
  const tokens = await issueTokenPair(user);
  return {
    ...tokens,
    user: { id: user.id, email: user.email, role: user.role },
  };
}

async function issueTokenPair(user) {
  const accessToken = signAccessToken(user);
  const rawRefresh = generateRefreshTokenRaw();
  const tokenHash = refreshTokenStorageHash(rawRefresh);
  const familyId = randomUUID();
  const expiresAt = new Date(
    Date.now() + env.refreshTokenTtlSec * 1000,
  );
  await prisma.refreshToken.create({
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
    throw new HttpError(401, 'Authentication required');
  }
  const user = existing.user;
  if (!user.isActive) {
    throw new HttpError(401, 'Authentication required');
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
      throw new HttpError(401, 'Authentication required');
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
    throw new HttpError(400, 'Invalid request');
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
