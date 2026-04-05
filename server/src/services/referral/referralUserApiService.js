import { prisma } from '../../db.js';
import {
  REFERRAL_REJECTION_REASON,
  REFERRAL_REWARD_TX_STATUS,
  REFERRAL_STATUS,
} from '../../constants/referral.js';
import { getReferralProgramConfig } from './referralProgramConfigService.js';
import { ensureUserReferralCode } from './referralCodeService.js';

function safeInviteeLabel(invitedUserId) {
  const s = String(invitedUserId ?? '');
  if (s.length < 4) return 'Friend';
  return `Friend · ${s.slice(-4)}`;
}

/**
 * Map internal failure reasons to opaque UI codes (no fraud wording).
 * @param {string | null | undefined} failureReason
 * @returns {string | null}
 */
export function mapFailureReasonToUserCode(failureReason) {
  const r = String(failureReason ?? '');
  if (!r) return 'generic';
  if (r === REFERRAL_REJECTION_REASON.BUDGET) return 'budget_full';
  if (r === REFERRAL_REJECTION_REASON.INVITER_WEEKLY_CAP) {
    return 'weekly_invite_cap';
  }
  if (r === REFERRAL_REJECTION_REASON.INVITER_LIFETIME_CAP) {
    return 'lifetime_invite_cap';
  }
  if (
    r === REFERRAL_REJECTION_REASON.FRAUD ||
    r === REFERRAL_REJECTION_REASON.ABUSE_SOFT ||
    r === 'abuse_blocked_duplicate_identity' ||
    r === 'abuse_review_soft_flags' ||
    r === 'self_referral'
  ) {
    return 'not_eligible';
  }
  return 'generic';
}

/**
 * Public status for clients: pending | completed | rewarded | rejected
 * @param {string} dbStatus
 */
export function mapReferralStatusPublic(dbStatus) {
  const u = String(dbStatus ?? '').toUpperCase();
  if (u === REFERRAL_STATUS.REWARDED) return 'rewarded';
  if (u === REFERRAL_STATUS.REJECTED) return 'rejected';
  if (u === REFERRAL_STATUS.COMPLETED) return 'completed';
  return 'pending';
}

/**
 * @param {string} userId
 */
export async function getReferralMePayload(userId) {
  const cfg = await getReferralProgramConfig();
  await ensureUserReferralCode(userId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  });

  const referrals = await prisma.referral.findMany({
    where: { inviterUserId: userId },
    select: { id: true, status: true },
  });

  const successfulReferrals = referrals.filter(
    (r) => r.status === REFERRAL_STATUS.REWARDED,
  ).length;

  const agg = await prisma.referralRewardTransaction.aggregate({
    where: {
      userId,
      status: REFERRAL_REWARD_TX_STATUS.COMPLETED,
      source: 'referral',
    },
    _sum: { amountUsdCents: true },
  });
  const rewardsEarnedUsd =
    Math.round((agg._sum.amountUsdCents ?? 0)) / 100;

  return {
    referralEnabled: cfg.referralEnabled === true,
    referralCode: user?.referralCode ?? null,
    stats: {
      totalInvited: referrals.length,
      successfulReferrals,
      rewardsEarnedUsd,
    },
    program: {
      rewardPerReferralUsd: Math.round(cfg.rewardAmountUsdCents) / 100,
      minFirstOrderUsd: Math.round(cfg.minFirstOrderUsdCents) / 100,
      showWeeklyPoolHint: true,
    },
  };
}

/**
 * @param {string} userId
 */
export async function getReferralHistoryPayload(userId) {
  const rows = await prisma.referral.findMany({
    where: { inviterUserId: userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      status: true,
      invitedUserId: true,
      createdAt: true,
      rewardTx: {
        select: {
          status: true,
          amountUsdCents: true,
          failureReason: true,
        },
      },
    },
  });

  return {
    items: rows.map((r) => {
      const pub = mapReferralStatusPublic(r.status);
      let rewardUsd = null;
      if (
        r.rewardTx?.status === REFERRAL_REWARD_TX_STATUS.COMPLETED &&
        pub === 'rewarded'
      ) {
        rewardUsd = Math.round(r.rewardTx.amountUsdCents) / 100;
      }
      let statusDetailCode = null;
      if (pub === 'rejected' && r.rewardTx?.failureReason) {
        statusDetailCode = mapFailureReasonToUserCode(r.rewardTx.failureReason);
      }
      return {
        id: r.id,
        inviteeLabel: safeInviteeLabel(r.invitedUserId),
        status: pub,
        rewardUsd,
        statusDetailCode,
        createdAt: r.createdAt.toISOString(),
      };
    }),
  };
}
