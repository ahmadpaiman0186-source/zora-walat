import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';

/**
 * @param {{ id: string; email: string; role: string; tokenVersion: number }} user
 */
export function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      tv: user.tokenVersion,
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
