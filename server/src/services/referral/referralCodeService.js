import { randomInt } from 'node:crypto';

import { prisma } from '../../db.js';

/** Avoid ambiguous glyphs (0/O, 1/I). */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LEN = 8;

export function normalizeReferralCodeInput(raw) {
  return String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function randomCode() {
  let s = '';
  for (let i = 0; i < CODE_LEN; i += 1) {
    s += ALPHABET[randomInt(0, ALPHABET.length)];
  }
  return s;
}

/**
 * Ensure user has a unique referral code (lazy backfill for legacy accounts).
 * @param {string} userId
 * @returns {Promise<string>}
 */
export async function ensureUserReferralCode(userId) {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  });
  if (existing?.referralCode) {
    return existing.referralCode;
  }

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const code = randomCode();
    try {
      await prisma.user.update({
        where: { id: userId, referralCode: null },
        data: { referralCode: code },
      });
      return code;
    } catch {
      /* collision on unique referralCode — retry */
    }
  }

  const fallback = `${userId.slice(-6).toUpperCase().replace(/[^A-Z0-9]/g, 'X')}R${randomInt(10, 99)}`;
  await prisma.user.update({
    where: { id: userId },
    data: { referralCode: fallback.slice(0, 16) },
  });
  return (await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  }))?.referralCode;
}
