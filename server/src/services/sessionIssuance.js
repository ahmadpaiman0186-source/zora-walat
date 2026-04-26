import { randomUUID } from 'node:crypto';

import { generateRefreshTokenRaw, refreshTokenStorageHash } from '../lib/authCrypto.js';
import { signAccessToken } from './authTokenService.js';
import { env } from '../config/env.js';

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {{ id: string; email: string; role: string; tokenVersion: number; emailVerifiedAt?: Date | null }} user
 */
export async function issueTokenPairWithTx(tx, user) {
  const accessToken = signAccessToken(user);
  const rawRefresh = generateRefreshTokenRaw();
  const tokenHash = refreshTokenStorageHash(rawRefresh);
  const familyId = randomUUID();
  const expiresAt = new Date(Date.now() + env.refreshTokenTtlSec * 1000);
  await tx.refreshToken.create({
    data: {
      tokenHash,
      userId: user.id,
      familyId,
      expiresAt,
    },
  });
  return {
    success: true,
    accessToken,
    refreshToken: rawRefresh,
    expiresIn: env.accessTokenTtlSec,
    tokenType: 'Bearer',
  };
}
