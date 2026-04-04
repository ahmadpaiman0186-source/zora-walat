import { createHash, randomBytes } from 'node:crypto';

import { env } from '../config/env.js';

export function sha256Hex(value) {
  return createHash('sha256').update(String(value), 'utf8').digest('hex');
}

/** DB stores only this — includes server pepper (`JWT_REFRESH_SECRET`). */
export function refreshTokenStorageHash(raw) {
  return sha256Hex(`${env.jwtRefreshSecret}:${raw}`);
}

/** Opaque refresh token (never store raw in DB — only hash). */
export function generateRefreshTokenRaw() {
  return randomBytes(48).toString('base64url');
}
