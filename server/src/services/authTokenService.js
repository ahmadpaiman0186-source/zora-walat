import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';

/**
 * @param {{ id: string; email: string; role: string; tokenVersion: number; emailVerifiedAt?: Date | null }} user
 */
export function signAccessToken(user) {
  const emailVerified = Boolean(user.emailVerifiedAt);
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      tv: user.tokenVersion,
      /** 1 = email verified; 0 = not verified (hint only — server enforces from DB). */
      ev: emailVerified ? 1 : 0,
    },
    env.jwtAccessSecret,
    { expiresIn: env.accessTokenTtlSec, issuer: 'zora-walat-api' },
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtAccessSecret, {
    issuer: 'zora-walat-api',
  });
}
