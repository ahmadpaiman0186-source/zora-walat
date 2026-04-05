import { prisma } from '../../db.js';
import { REFERRAL_FRAUD_FLAG } from '../../constants/referral.js';

/**
 * @param {object} p
 * @param {{ id: string, signupIpHash: string | null, email: string } | null} p.inviter
 * @param {{ id: string, signupIpHash: string | null, email: string } | null} p.invitee
 * @param {string | null} p.appliedIpHash
 * @param {string} p.inviterUserId
 */
export async function evaluateReferralAbuseSignals(p) {
  /** @type {string[]} */
  const flags = [];

  if (p.inviter && p.invitee?.signupIpHash && p.inviter.signupIpHash) {
    if (p.invitee.signupIpHash === p.inviter.signupIpHash) {
      flags.push(REFERRAL_FRAUD_FLAG.DUPLICATE_IDENTITY_SIGNAL);
    }
  }

  if (p.appliedIpHash && p.inviter?.signupIpHash === p.appliedIpHash) {
    flags.push(REFERRAL_FRAUD_FLAG.DUPLICATE_IDENTITY_SIGNAL);
  }

  if (p.inviter && p.invitee) {
    const domA = emailDomain(p.inviter.email);
    const domB = emailDomain(p.invitee.email);
    if (domA && domA === domB) {
      flags.push(REFERRAL_FRAUD_FLAG.SUSPICIOUS_REFERRAL);
    }
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  if (p.appliedIpHash) {
    const rapid = await prisma.referral.count({
      where: {
        inviterUserId: p.inviterUserId,
        appliedIpHash: p.appliedIpHash,
        createdAt: { gte: since },
      },
    });
    if (rapid >= 12) {
      flags.push(REFERRAL_FRAUD_FLAG.REPEATED_PATTERN);
    }
  }

  const unique = [...new Set(flags)];
  const hardBlock = unique.includes(REFERRAL_FRAUD_FLAG.DUPLICATE_IDENTITY_SIGNAL);

  return { flags: unique, hardBlock };
}

function emailDomain(email) {
  const i = String(email ?? '').lastIndexOf('@');
  if (i <= 0) return null;
  return String(email).slice(i + 1).toLowerCase().trim() || null;
}
