import { prisma } from '../../db.js';
import { readReferralEnvOverrides } from './referralEnvOverrides.js';

const DEFAULT_ID = 'default';

const DEFAULTS = {
  referralEnabled: true,
  weeklyBudgetUsdCents: 5000,
  rewardAmountUsdCents: 500,
  minFirstOrderUsdCents: 100,
  maxRewardsPerUser: 20,
  maxRewardsPerInviterPerWeek: 10,
  rewardDelayMinutes: 5,
  referralBonusLoyaltyPoints: 0,
  pausePausedQueueProcessing: false,
};

export async function getReferralProgramConfig() {
  const row = await prisma.referralProgramConfig.upsert({
    where: { id: DEFAULT_ID },
    create: { id: DEFAULT_ID, ...DEFAULTS },
    update: {},
  });
  const envOv = readReferralEnvOverrides();
  return { ...row, ...envOv };
}

/**
 * Staff-only updates — validates sane bounds.
 * @param {Partial<typeof DEFAULTS>} patch
 */
export async function updateReferralProgramConfig(patch) {
  const cur = await getReferralProgramConfig();
  const next = {
    referralEnabled:
      typeof patch.referralEnabled === 'boolean'
        ? patch.referralEnabled
        : cur.referralEnabled,
    weeklyBudgetUsdCents: clampInt(
      patch.weeklyBudgetUsdCents,
      cur.weeklyBudgetUsdCents,
      0,
      500_000,
    ),
    rewardAmountUsdCents: clampInt(
      patch.rewardAmountUsdCents,
      cur.rewardAmountUsdCents,
      0,
      50_000,
    ),
    minFirstOrderUsdCents: clampInt(
      patch.minFirstOrderUsdCents,
      cur.minFirstOrderUsdCents,
      0,
      1_000_000,
    ),
    maxRewardsPerUser: clampInt(
      patch.maxRewardsPerUser,
      cur.maxRewardsPerUser,
      1,
      10_000,
    ),
    maxRewardsPerInviterPerWeek: clampInt(
      patch.maxRewardsPerInviterPerWeek,
      cur.maxRewardsPerInviterPerWeek ?? 10,
      1,
      10_000,
    ),
    rewardDelayMinutes: clampInt(
      patch.rewardDelayMinutes,
      cur.rewardDelayMinutes,
      1,
      1440,
    ),
    referralBonusLoyaltyPoints: clampInt(
      patch.referralBonusLoyaltyPoints,
      cur.referralBonusLoyaltyPoints,
      0,
      100_000,
    ),
    pausePausedQueueProcessing:
      typeof patch.pausePausedQueueProcessing === 'boolean'
        ? patch.pausePausedQueueProcessing
        : cur.pausePausedQueueProcessing,
  };

  return prisma.referralProgramConfig.update({
    where: { id: DEFAULT_ID },
    data: next,
  });
}

/**
 * @param {unknown} v
 * @param {number} fallback
 * @param {number} min
 * @param {number} max
 */
function clampInt(v, fallback, min, max) {
  const n = parseInt(String(v ?? ''), 10);
  if (!Number.isFinite(n)) return Math.min(max, Math.max(min, fallback));
  return Math.min(max, Math.max(min, n));
}
