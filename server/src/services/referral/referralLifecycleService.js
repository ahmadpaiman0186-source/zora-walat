import { randomUUID } from 'node:crypto';

import { Prisma } from '@prisma/client';
import { prisma } from '../../db.js';
import { env } from '../../config/env.js';
import { ORDER_STATUS } from '../../constants/orderStatus.js';
import {
  REFERRAL_STATUS,
  REFERRAL_REWARD_TX_STATUS,
  REFERRAL_FRAUD_FLAG,
  REFERRAL_REJECTION_REASON,
} from '../../constants/referral.js';
import { getReferralProgramConfig } from './referralProgramConfigService.js';
import { evaluateReferralAbuseSignals } from './referralAbuseService.js';
import { utcLeaderboardMonth } from '../loyaltyPointsService.js';
import { hashReferralCorrelation } from '../../lib/referralPrivacyHash.js';
import { logReferralEvent } from '../../lib/referralLog.js';
import { getTraceId } from '../../lib/requestContext.js';
import { readReferralEnvOverrides } from './referralEnvOverrides.js';
import { logOpsEvent } from '../../lib/opsLog.js';
import {
  LOYALTY_LEDGER_SOURCE,
  LOYALTY_LEDGER_TYPE,
  loyaltyLedgerReferralBonusRowId,
  loyaltyLedgerReferralBonusSourceId,
} from '../../constants/loyaltyLedger.js';

/** Monday 00:00 UTC */
function startOfUtcWeek(d = new Date()) {
  const x = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
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
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 */
async function countInviterRewardsUtcWeek(tx, inviterUserId, weekStart) {
  const weekEnd = endOfUtcWeek(weekStart);
  return tx.referral.count({
    where: {
      inviterUserId,
      status: REFERRAL_STATUS.REWARDED,
      rewardedAt: { gte: weekStart, lt: weekEnd },
    },
  });
}

function scheduleMsFromCfg(cfg) {
  const envOv = readReferralEnvOverrides();
  if (envOv.evalDelayMs != null) return envOv.evalDelayMs;
  return Math.max(30_000, (cfg.rewardDelayMinutes ?? 5) * 60 * 1000);
}

/**
 * @param {string} paymentCheckoutId
 * @param {string | null | undefined} traceId From fulfillment / webhook (async timeout loses AsyncLocalStorage otherwise).
 */
export function scheduleReferralEvaluationAfterDelivery(paymentCheckoutId, traceId = null) {
  if (!env.referralEvaluationSchedulingEnabled) {
    console.warn('[referral] REFERRAL_EVALUATION_SCHEDULING_DISABLED — post-delivery evaluation not scheduled', {
      orderIdSuffix: String(paymentCheckoutId).slice(-12),
    });
    return;
  }
  const boundTrace = traceId ?? getTraceId();
  void getReferralProgramConfig()
    .then((cfg) => {
      const ms = scheduleMsFromCfg(cfg);
      setTimeout(() => {
        processReferralForDeliveredOrder(paymentCheckoutId, {
          traceId: boundTrace,
        }).catch((err) => {
          console.error('[referral] evaluation failed', err);
        });
      }, ms);
    })
    .catch((err) => {
      console.error(
        '[referral] schedule config load failed — not scheduling evaluation (requires confirmed program config)',
        err?.message ?? err,
      );
    });
}

async function upsertFailedRewardTx(referralId, inviterUserId, amountCents, reason) {
  await prisma.referralRewardTransaction.upsert({
    where: { referralId },
    create: {
      id: randomUUID(),
      userId: inviterUserId,
      referralId,
      amountUsdCents: amountCents,
      source: 'referral',
      status: REFERRAL_REWARD_TX_STATUS.FAILED,
      failureReason: reason,
    },
    update: {
      status: REFERRAL_REWARD_TX_STATUS.FAILED,
      failureReason: reason,
      amountUsdCents: amountCents,
    },
  });
}

/**
 * Idempotent: safe to call multiple times for the same order.
 * @param {string} orderId PaymentCheckout.id
 * @param {{ traceId?: string | null }} [opts]
 */
export async function processReferralForDeliveredOrder(orderId, opts = {}) {
  const traceId = opts.traceId ?? getTraceId();
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
      metadata: true,
      requestFingerprint: true,
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

  if (referral.status === REFERRAL_STATUS.REWARDED) {
    return { ok: true, reason: 'already_rewarded' };
  }

  if (referral.status === REFERRAL_STATUS.REJECTED) {
    return { ok: false, reason: 'rejected_terminal' };
  }

  if (referral.status === REFERRAL_STATUS.REWARD_PAUSED) {
    if (cfg.pausePausedQueueProcessing) {
      return { ok: false, reason: 'paused_queue_off' };
    }
    return { ok: false, reason: 'legacy_paused_use_reprocess' };
  }

  if (referral.inviterUserId === referral.invitedUserId) {
    await prisma.referral.update({
      where: { id: referral.id },
      data: {
        status: REFERRAL_STATUS.REJECTED,
        firstOrderId: order.id,
        completedAt: referral.completedAt ?? new Date(),
      },
    });
    await upsertFailedRewardTx(
      referral.id,
      referral.inviterUserId,
      cfg.rewardAmountUsdCents,
      'self_referral',
    );
    logReferralEvent('referral_rejected', {
      traceId,
      referralId: referral.id,
      inviterUserId: referral.inviterUserId,
      invitedUserId: referral.invitedUserId,
      extra: { reason: 'self_referral' },
    });
    return { ok: false, reason: 'self_referral' };
  }

  const meta =
    order.metadata && typeof order.metadata === 'object' && !Array.isArray(order.metadata)
      ? /** @type {Record<string, unknown>} */ (order.metadata)
      : null;
  const deviceRaw =
    meta && typeof meta.deviceFingerprint === 'string'
      ? meta.deviceFingerprint
      : null;
  const orderDeviceHash = deviceRaw
    ? hashReferralCorrelation(deviceRaw)
    : order.requestFingerprint
      ? hashReferralCorrelation(order.requestFingerprint)
      : null;

  const abuse = await evaluateReferralAbuseSignals({
    inviter: referral.inviter,
    invitee: referral.invited,
    appliedIpHash: referral.appliedIpHash,
    inviterUserId: referral.inviterUserId,
    currentInviteeUserId: referral.invitedUserId,
    checkoutMetadata: order.metadata,
    orderDeviceHash,
  });

  const fraudMerge = {
    ...(typeof referral.fraudFlags === 'object' && referral.fraudFlags
      ? /** @type {Record<string, unknown>} */ (referral.fraudFlags)
      : {}),
    flags: abuse.flags,
    lastEvaluatedAt: new Date().toISOString(),
  };

  const rejectFraud = async (reason, extra) => {
    await prisma.referral.update({
      where: { id: referral.id },
      data: {
        status: REFERRAL_STATUS.REJECTED,
        firstOrderId: order.id,
        completedAt: referral.completedAt ?? new Date(),
        fraudFlags: fraudMerge,
      },
    });
    await upsertFailedRewardTx(
      referral.id,
      referral.inviterUserId,
      cfg.rewardAmountUsdCents,
      reason,
    );
    logReferralEvent('referral_fraud_detected', {
      traceId,
      referralId: referral.id,
      inviterUserId: referral.inviterUserId,
      invitedUserId: referral.invitedUserId,
      extra: { reason, ...extra },
    });
    logReferralEvent('referral_rejected', {
      traceId,
      referralId: referral.id,
      inviterUserId: referral.inviterUserId,
      invitedUserId: referral.invitedUserId,
      extra: { reason },
    });
  };

  if (abuse.hardBlock) {
    await rejectFraud(REFERRAL_REJECTION_REASON.FRAUD, { hardBlock: true });
    return { ok: false, reason: 'abuse_blocked' };
  }

  const softPause =
    abuse.flags.includes(REFERRAL_FRAUD_FLAG.SUSPICIOUS_REFERRAL) ||
    abuse.flags.includes(REFERRAL_FRAUD_FLAG.REPEATED_PATTERN);

  if (softPause) {
    await rejectFraud(REFERRAL_REJECTION_REASON.ABUSE_SOFT, {
      flags: abuse.flags,
    });
    return { ok: false, reason: 'abuse_soft' };
  }

  const completedUp = await prisma.referral.updateMany({
    where: { id: referral.id, status: REFERRAL_STATUS.PENDING },
    data: {
      status: REFERRAL_STATUS.COMPLETED,
      firstOrderId: order.id,
      completedAt: new Date(),
      fraudFlags: fraudMerge,
    },
  });
  if (completedUp.count > 0) {
    logReferralEvent('referral_completed', {
      traceId,
      referralId: referral.id,
      inviterUserId: referral.inviterUserId,
      invitedUserId: referral.invitedUserId,
      extra: { orderIdSuffix: order.id.slice(-10) },
    });
  }

  const weekStart = startOfUtcWeek();
  const weekEnd = endOfUtcWeek(weekStart);
  const capWeek = Math.max(
    1,
    Number(cfg.maxRewardsPerInviterPerWeek ?? 10) || 10,
  );
  const weeklyInviterRewards = await prisma.referral.count({
    where: {
      inviterUserId: referral.inviterUserId,
      status: REFERRAL_STATUS.REWARDED,
      rewardedAt: { gte: weekStart, lt: weekEnd },
    },
  });
  if (weeklyInviterRewards >= capWeek) {
    const demoted = await prisma.referral.updateMany({
      where: {
        id: referral.id,
        status: {
          in: [REFERRAL_STATUS.PENDING, REFERRAL_STATUS.COMPLETED],
        },
      },
      data: {
        status: REFERRAL_STATUS.REJECTED,
        fraudFlags: fraudMerge,
      },
    });
    if (demoted.count === 0) {
      return { ok: false, reason: 'inviter_weekly_cap_skip_terminal' };
    }
    await upsertFailedRewardTx(
      referral.id,
      referral.inviterUserId,
      cfg.rewardAmountUsdCents,
      REFERRAL_REJECTION_REASON.INVITER_WEEKLY_CAP,
    );
    logReferralEvent('referral_rejected', {
      traceId,
      referralId: referral.id,
      inviterUserId: referral.inviterUserId,
      invitedUserId: referral.invitedUserId,
      extra: { reason: REFERRAL_REJECTION_REASON.INVITER_WEEKLY_CAP },
    });
    return { ok: false, reason: 'inviter_weekly_cap' };
  }

  const rewardedLifetime = await prisma.referral.count({
    where: {
      inviterUserId: referral.inviterUserId,
      status: REFERRAL_STATUS.REWARDED,
    },
  });
  if (rewardedLifetime >= cfg.maxRewardsPerUser) {
    const demoted = await prisma.referral.updateMany({
      where: {
        id: referral.id,
        status: {
          in: [REFERRAL_STATUS.PENDING, REFERRAL_STATUS.COMPLETED],
        },
      },
      data: { status: REFERRAL_STATUS.REJECTED, fraudFlags: fraudMerge },
    });
    if (demoted.count === 0) {
      return { ok: false, reason: 'inviter_cap_skip_terminal' };
    }
    await upsertFailedRewardTx(
      referral.id,
      referral.inviterUserId,
      cfg.rewardAmountUsdCents,
      REFERRAL_REJECTION_REASON.INVITER_LIFETIME_CAP,
    );
    logReferralEvent('referral_rejected', {
      traceId,
      referralId: referral.id,
      inviterUserId: referral.inviterUserId,
      invitedUserId: referral.invitedUserId,
      extra: { reason: REFERRAL_REJECTION_REASON.INVITER_LIFETIME_CAP },
    });
    return { ok: false, reason: 'inviter_cap' };
  }

  return prisma.$transaction(async (tx) => {
    const fresh = await tx.referral.findUnique({ where: { id: referral.id } });
    if (!fresh) {
      return { ok: false, reason: 'referral_missing' };
    }
    if (fresh.status === REFERRAL_STATUS.REWARDED) {
      const txRow = await tx.referralRewardTransaction.findUnique({
        where: { referralId: referral.id },
      });
      if (
        !txRow ||
        txRow.status !== REFERRAL_REWARD_TX_STATUS.COMPLETED
      ) {
        logReferralEvent('referral_integrity_mismatch', {
          traceId,
          referralId: referral.id,
          inviterUserId: referral.inviterUserId,
          invitedUserId: referral.invitedUserId,
          extra: {
            orderIdSuffix: order.id.slice(-10),
            rewardTxStatus: txRow?.status ?? 'missing',
          },
        });
        logOpsEvent({
          domain: 'referral',
          event: 'reward_state',
          outcome: 'integrity_mismatch',
          orderId,
          traceId,
          extra: {
            referralIdSuffix: referral.id.slice(-10),
            rewardTxStatus: txRow?.status ?? 'missing',
          },
        });
      }
      return { ok: true, reason: 'noop_terminal' };
    }
    if (fresh.status === REFERRAL_STATUS.REJECTED) {
      return { ok: false, reason: 'rejected_terminal' };
    }

    const spend = await sumWeeklyRewardSpend(tx, weekStart);
    const reward = cfg.rewardAmountUsdCents;

    if (spend + reward > cfg.weeklyBudgetUsdCents) {
      const rej = await tx.referral.updateMany({
        where: {
          id: referral.id,
          status: {
            in: [REFERRAL_STATUS.PENDING, REFERRAL_STATUS.COMPLETED],
          },
        },
        data: {
          status: REFERRAL_STATUS.REJECTED,
          fraudFlags: fraudMerge,
        },
      });
      if (rej.count === 0) {
        return { ok: true, reason: 'budget_race_terminal' };
      }
      await tx.referralRewardTransaction.upsert({
        where: { referralId: referral.id },
        create: {
          id: randomUUID(),
          userId: referral.inviterUserId,
          referralId: referral.id,
          amountUsdCents: reward,
          source: 'referral',
          status: REFERRAL_REWARD_TX_STATUS.FAILED,
          failureReason: REFERRAL_REJECTION_REASON.BUDGET,
        },
        update: {
          status: REFERRAL_REWARD_TX_STATUS.FAILED,
          failureReason: REFERRAL_REJECTION_REASON.BUDGET,
          amountUsdCents: reward,
        },
      });
      logReferralEvent('referral_rejected', {
        traceId,
        referralId: referral.id,
        inviterUserId: referral.inviterUserId,
        invitedUserId: referral.invitedUserId,
        extra: {
          reason: 'referral_budget_exceeded',
          eventCode: REFERRAL_REJECTION_REASON.BUDGET,
        },
      });
      return { ok: false, reason: 'budget' };
    }

    const inviterWeekCount = await countInviterRewardsUtcWeek(
      tx,
      referral.inviterUserId,
      weekStart,
    );
    if (inviterWeekCount >= capWeek) {
      const rej = await tx.referral.updateMany({
        where: {
          id: referral.id,
          status: {
            in: [REFERRAL_STATUS.PENDING, REFERRAL_STATUS.COMPLETED],
          },
        },
        data: { status: REFERRAL_STATUS.REJECTED, fraudFlags: fraudMerge },
      });
      if (rej.count === 0) {
        return { ok: false, reason: 'inviter_weekly_cap_race' };
      }
      await tx.referralRewardTransaction.upsert({
        where: { referralId: referral.id },
        create: {
          id: randomUUID(),
          userId: referral.inviterUserId,
          referralId: referral.id,
          amountUsdCents: reward,
          source: 'referral',
          status: REFERRAL_REWARD_TX_STATUS.FAILED,
          failureReason: REFERRAL_REJECTION_REASON.INVITER_WEEKLY_CAP,
        },
        update: {
          status: REFERRAL_REWARD_TX_STATUS.FAILED,
          failureReason: REFERRAL_REJECTION_REASON.INVITER_WEEKLY_CAP,
        },
      });
      return { ok: false, reason: 'inviter_weekly_cap' };
    }

    const marked = await tx.referral.updateMany({
      where: {
        id: referral.id,
        status: REFERRAL_STATUS.COMPLETED,
      },
      data: {
        status: REFERRAL_STATUS.REWARDED,
        firstOrderId: order.id,
        completedAt: fresh.completedAt ?? new Date(),
        rewardedAt: new Date(),
        fraudFlags: fraudMerge,
      },
    });
    if (marked.count === 0) {
      return { ok: true, reason: 'noop_terminal' };
    }

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
        id: randomUUID(),
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

        try {
          await tx.loyaltyLedger.create({
            data: {
              id: loyaltyLedgerReferralBonusRowId(referral.id),
              userId: referral.inviterUserId,
              source: LOYALTY_LEDGER_SOURCE.REFERRAL_BONUS,
              sourceId: loyaltyLedgerReferralBonusSourceId(referral.id),
              amount: bonusPoints,
              type: LOYALTY_LEDGER_TYPE.CREDIT,
            },
          });
        } catch (le) {
          if (
            le instanceof Prisma.PrismaClientKnownRequestError &&
            le.code === 'P2002'
          ) {
            /* ledger idempotent with bonus */
          } else {
            throw le;
          }
        }

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

    logReferralEvent('referral_rewarded', {
      traceId,
      referralId: referral.id,
      inviterUserId: referral.inviterUserId,
      invitedUserId: referral.invitedUserId,
      extra: {
        amountUsdCents: reward,
        orderIdSuffix: order.id.slice(-10),
      },
    });

    return { ok: true, reason: 'rewarded' };
  });
}

/**
 * Admin / cron: retry deferred referrals after budget reset or policy change.
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

  const budgetRejected = await prisma.referral.findMany({
    where: {
      status: REFERRAL_STATUS.REJECTED,
      rewardTx: {
        failureReason: REFERRAL_REJECTION_REASON.BUDGET,
      },
    },
    select: { id: true, firstOrderId: true },
    take,
  });

  const seen = new Set();
  const rows = [];
  for (const row of [...paused, ...budgetRejected]) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    rows.push(row);
  }
  let processed = 0;
  for (const row of rows) {
    if (!row.firstOrderId) continue;
    await prisma.referral.update({
      where: { id: row.id },
      data: { status: REFERRAL_STATUS.COMPLETED },
    });
    const r = await processReferralForDeliveredOrder(row.firstOrderId);
    if (r?.ok && r?.reason === 'rewarded') processed += 1;
  }

  return { processed, count: rows.length };
}
