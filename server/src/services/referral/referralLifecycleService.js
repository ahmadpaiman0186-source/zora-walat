import { createId as cuid } from '@paralleldrive/cuid2';

import { prisma } from '../../db.js';
import { ORDER_STATUS } from '../../constants/orderStatus.js';
import {
  REFERRAL_STATUS,
  REFERRAL_REWARD_TX_STATUS,
  REFERRAL_FRAUD_FLAG,
} from '../../constants/referral.js';
import { getReferralProgramConfig } from './referralProgramConfigService.js';
import { evaluateReferralAbuseSignals } from './referralAbuseService.js';
import { utcLeaderboardMonth } from '../loyaltyPointsService.js';

/** Monday 00:00 UTC */
function startOfUtcWeek(d = new Date()) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = x.getUTCDay();
  const diff = (day + 6) % 7;
  x.setUTCDate(x.getUTCDate() - diff);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function endOfUtcWeek(start) {
  const e = new Date(start);
  e.setUTCDate(e.getUTCDate() + 7);
  return e;
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {Date} weekStartedAt
 */
async function sumWeeklyRewardSpend(tx, weekStartedAt) {
  const weekEnd = endOfUtcWeek(weekStartedAt);
  const agg = await tx.referralRewardTransaction.aggregate({
    where: {
      status: REFERRAL_REWARD_TX_STATUS.COMPLETED,
      createdAt: { gte: weekStartedAt, lt: weekEnd },
    },
    _sum: { amountUsdCents: true },
  });
  return agg._sum.amountUsdCents ?? 0;
}

/**
 * Cool-down after successful delivery before payout attempt.
 * @param {string} paymentCheckoutId
 */
export function scheduleReferralEvaluationAfterDelivery(paymentCheckoutId) {
  void getReferralProgramConfig()
    .then((cfg) => {
      const ms = Math.max(
        30_000,
        (cfg.rewardDelayMinutes ?? 5) * 60 * 1000,
      );
      setTimeout(() => {
        processReferralForDeliveredOrder(paymentCheckoutId).catch((err) => {
          console.error('[referral] delayed processing failed', err);
        });
      }, ms);
    })
    .catch((err) => {
      console.error('[referral] schedule config load failed', err);
      setTimeout(() => {
        processReferralForDeliveredOrder(paymentCheckoutId).catch((e) =>
          console.error('[referral] delayed processing failed', e),
        );
      }, 5 * 60 * 1000);
    });
}

/**
 * Idempotent: safe to call multiple times for the same order (webhook + client kick).
 * @param {string} orderId PaymentCheckout.id
 */
export async function processReferralForDeliveredOrder(orderId) {
  const cfg = await getReferralProgramConfig();
  if (!cfg.referralEnabled) {
    return { ok: false, reason: 'disabled' };
  }

  const order = await prisma.paymentCheckout.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      userId: true,
      orderStatus: true,
      amountUsdCents: true,
    },
  });

  if (!order?.userId || order.orderStatus !== ORDER_STATUS.FULFILLED) {
    return { ok: false, reason: 'order_not_eligible' };
  }

  const firstDelivered = await prisma.paymentCheckout.findFirst({
    where: {
      userId: order.userId,
      orderStatus: ORDER_STATUS.FULFILLED,
    },
    orderBy: [{ paidAt: 'asc' }, { createdAt: 'asc' }],
  });

  if (!firstDelivered || firstDelivered.id !== order.id) {
    return { ok: false, reason: 'not_first_delivered_order' };
  }

  if (order.amountUsdCents < cfg.minFirstOrderUsdCents) {
    return { ok: false, reason: 'below_min_order' };
  }

  const referral = await prisma.referral.findUnique({
    where: { invitedUserId: order.userId },
    include: {
      inviter: { select: { id: true, email: true, signupIpHash: true } },
      invited: { select: { id: true, email: true, signupIpHash: true } },
    },
  });

  if (!referral) {
    return { ok: false, reason: 'no_referral' };
  }

  if (
    referral.status === REFERRAL_STATUS.REWARDED ||
    (referral.status === REFERRAL_STATUS.REWARD_PAUSED && cfg.pausePausedQueueProcessing)
  ) {
    if (
      referral.status === REFERRAL_STATUS.REWARD_PAUSED &&
      cfg.pausePausedQueueProcessing
    ) {
      return { ok: false, reason: 'paused_queue_off' };
    }
    if (referral.status === REFERRAL_STATUS.REWARDED) {
      return { ok: true, reason: 'already_rewarded' };
    }
  }

  if (referral.inviterUserId === referral.invitedUserId) {
    return { ok: false, reason: 'self_referral' };
  }

  const abuse = await evaluateReferralAbuseSignals({
    inviter: referral.inviter,
    invitee: referral.invited,
    appliedIpHash: referral.appliedIpHash,
    inviterUserId: referral.inviterUserId,
  });

  const fraudMerge = {
    ...(typeof referral.fraudFlags === 'object' && referral.fraudFlags
      ? /** @type {Record<string, unknown>} */ (referral.fraudFlags)
      : {}),
    flags: abuse.flags,
    lastEvaluatedAt: new Date().toISOString(),
  };

  if (abuse.hardBlock) {
    await prisma.referral.update({
      where: { id: referral.id },
      data: {
        status: REFERRAL_STATUS.REWARD_PAUSED,
        firstOrderId: order.id,
        completedAt: referral.completedAt ?? new Date(),
        fraudFlags: fraudMerge,
      },
    });
    await prisma.referralRewardTransaction.upsert({
      where: { referralId: referral.id },
      create: {
        id: cuid(),
        userId: referral.inviterUserId,
        referralId: referral.id,
        amountUsdCents: cfg.rewardAmountUsdCents,
        source: 'referral',
        status: REFERRAL_REWARD_TX_STATUS.FAILED,
        failureReason: 'abuse_blocked_duplicate_identity',
      },
      update: {
        status: REFERRAL_REWARD_TX_STATUS.FAILED,
        failureReason: 'abuse_blocked_duplicate_identity',
      },
    });
    return { ok: false, reason: 'abuse_blocked' };
  }

  /** Soft flags: pause for review when suspicious or repeated pattern. */
  const softPause =
    abuse.flags.includes(REFERRAL_FRAUD_FLAG.SUSPICIOUS_REFERRAL) ||
    abuse.flags.includes(REFERRAL_FRAUD_FLAG.REPEATED_PATTERN);

  if (softPause) {
    await prisma.referral.update({
      where: { id: referral.id },
      data: {
        status: REFERRAL_STATUS.REWARD_PAUSED,
        firstOrderId: order.id,
        completedAt: new Date(),
        fraudFlags: fraudMerge,
      },
    });
    await prisma.referralRewardTransaction.upsert({
      where: { referralId: referral.id },
      create: {
        id: cuid(),
        userId: referral.inviterUserId,
        referralId: referral.id,
        amountUsdCents: cfg.rewardAmountUsdCents,
        source: 'referral',
        status: REFERRAL_REWARD_TX_STATUS.FAILED,
        failureReason: 'abuse_review_soft_flags',
      },
      update: {
        status: REFERRAL_REWARD_TX_STATUS.FAILED,
        failureReason: 'abuse_review_soft_flags',
      },
    });
    return { ok: false, reason: 'abuse_soft_paused' };
  }

  const rewardedCount = await prisma.referral.count({
    where: {
      inviterUserId: referral.inviterUserId,
      status: REFERRAL_STATUS.REWARDED,
    },
  });
  if (rewardedCount >= cfg.maxRewardsPerUser) {
    await prisma.referral.update({
      where: { id: referral.id },
      data: {
        status: REFERRAL_STATUS.REWARD_PAUSED,
        firstOrderId: order.id,
        completedAt: new Date(),
        fraudFlags: fraudMerge,
      },
    });
    await prisma.referralRewardTransaction.upsert({
      where: { referralId: referral.id },
      create: {
        id: cuid(),
        userId: referral.inviterUserId,
        referralId: referral.id,
        amountUsdCents: cfg.rewardAmountUsdCents,
        source: 'referral',
        status: REFERRAL_REWARD_TX_STATUS.FAILED,
        failureReason: 'inviter_reward_cap',
      },
      update: {
        status: REFERRAL_REWARD_TX_STATUS.FAILED,
        failureReason: 'inviter_reward_cap',
      },
    });
    return { ok: false, reason: 'inviter_cap' };
  }

  const weekStart = startOfUtcWeek();

  return prisma.$transaction(async (tx) => {
    const fresh = await tx.referral.findUnique({
      where: { id: referral.id },
    });
    if (!fresh || fresh.status === REFERRAL_STATUS.REWARDED) {
      return { ok: true, reason: 'noop_terminal' };
    }

    const spend = await sumWeeklyRewardSpend(tx, weekStart);
    const reward = cfg.rewardAmountUsdCents;

    if (spend + reward > cfg.weeklyBudgetUsdCents) {
      await tx.referral.update({
        where: { id: referral.id },
        data: {
          status: REFERRAL_STATUS.REWARD_PAUSED,
          firstOrderId: order.id,
          completedAt: fresh.completedAt ?? new Date(),
          fraudFlags: fraudMerge,
        },
      });
      await tx.referralRewardTransaction.upsert({
        where: { referralId: referral.id },
        create: {
          id: cuid(),
          userId: referral.inviterUserId,
          referralId: referral.id,
          amountUsdCents: reward,
          source: 'referral',
          status: REFERRAL_REWARD_TX_STATUS.FAILED,
          failureReason: 'weekly_budget_exceeded',
        },
        update: {
          status: REFERRAL_REWARD_TX_STATUS.FAILED,
          failureReason: 'weekly_budget_exceeded',
          amountUsdCents: reward,
        },
      });
      return { ok: false, reason: 'budget' };
    }

    const existingOk = await tx.referralRewardTransaction.findUnique({
      where: { referralId: referral.id },
    });
    if (
      existingOk?.status === REFERRAL_REWARD_TX_STATUS.COMPLETED &&
      fresh.status === REFERRAL_STATUS.REWARDED
    ) {
      return { ok: true, reason: 'idempotent' };
    }

    await tx.referral.update({
      where: { id: referral.id },
      data: {
        status: REFERRAL_STATUS.REWARDED,
        firstOrderId: order.id,
        completedAt: fresh.completedAt ?? new Date(),
        rewardedAt: new Date(),
        fraudFlags: fraudMerge,
      },
    });

    const DEFAULT_MAIN_CENTS = 10000;
    await tx.userWallet.upsert({
      where: { userId: referral.inviterUserId },
      create: {
        userId: referral.inviterUserId,
        balanceUsdCents: DEFAULT_MAIN_CENTS,
        promotionalBalanceUsdCents: 0,
        currency: 'USD',
      },
      update: {},
    });

    await tx.userWallet.update({
      where: { userId: referral.inviterUserId },
      data: {
        promotionalBalanceUsdCents: { increment: reward },
      },
    });

    await tx.referralRewardTransaction.upsert({
      where: { referralId: referral.id },
      create: {
        id: cuid(),
        userId: referral.inviterUserId,
        referralId: referral.id,
        amountUsdCents: reward,
        source: 'referral',
        status: REFERRAL_REWARD_TX_STATUS.COMPLETED,
      },
      update: {
        status: REFERRAL_REWARD_TX_STATUS.COMPLETED,
        amountUsdCents: reward,
        failureReason: null,
      },
    });

    const bonusPoints = cfg.referralBonusLoyaltyPoints ?? 0;
    if (bonusPoints > 0) {
      try {
        const member = await tx.familyGroupMember.findUnique({
          where: { userId: referral.inviterUserId },
          select: { groupId: true },
        });
        const groupId = member?.groupId ?? null;
        const leaderboardMonth = utcLeaderboardMonth();

        await tx.referralLoyaltyBonus.create({
          data: {
            referralId: referral.id,
            userId: referral.inviterUserId,
            points: bonusPoints,
          },
        });

        await tx.user.update({
          where: { id: referral.inviterUserId },
          data: { loyaltyPointsTotal: { increment: bonusPoints } },
        });

        if (groupId) {
          await tx.familyGroup.update({
            where: { id: groupId },
            data: { totalPoints: { increment: bonusPoints } },
          });
        }
        // Optional: snapshot month on grant for analytics — leaderboardMonth unused in ReferralLoyaltyBonus schema; skip
        void leaderboardMonth;
      } catch (e) {
        if (
          e instanceof import('@prisma/client').Prisma.PrismaClientKnownRequestError &&
          e.code === 'P2002'
        ) {
          /* already granted bonus */
        } else {
          throw e;
        }
      }
    }

    return { ok: true, reason: 'rewarded' };
  });
}

/**
 * Admin / cron: retry REWARD_PAUSED rows after budget reset or policy change.
 * @param {{ limit?: number }} [opts]
 */
export async function reprocessPausedReferrals(opts = {}) {
  const cfg = await getReferralProgramConfig();
  if (cfg.pausePausedQueueProcessing) {
    return { processed: 0, skipped: true };
  }

  const take = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const paused = await prisma.referral.findMany({
    where: { status: REFERRAL_STATUS.REWARD_PAUSED },
    select: { id: true, firstOrderId: true },
    take,
  });

  let processed = 0;
  for (const row of paused) {
    if (!row.firstOrderId) continue;
    await prisma.referral.update({
      where: { id: row.id },
      data: { status: REFERRAL_STATUS.COMPLETED },
    });
    const r = await processReferralForDeliveredOrder(row.firstOrderId);
    if (r?.ok && r?.reason === 'rewarded') processed += 1;
  }

  return { processed, count: paused.length };
}
