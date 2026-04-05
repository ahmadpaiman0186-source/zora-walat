import { createHmac } from 'node:crypto';

import { env } from '../config/env.js';

/**
 * One-way correlation token for IP/device (never log raw values).
 * @param {string | null | undefined} raw
 * @returns {string | null}
 */
export function hashReferralCorrelation(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const salt = env.referralPrivacySalt || env.jwtAccessSecret || 'referral-dev-salt';
  return createHmac('sha256', salt).update(s).digest('hex').slice(0, 48);
}
