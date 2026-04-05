/**
 * Production ops: env overrides DB singleton for referral knobs (12-factor).
 * Unset env → use `ReferralProgramConfig` row values.
 */

/**
 * @returns {Partial<{
 *   referralEnabled: boolean,
 *   rewardAmountUsdCents: number,
 *   weeklyBudgetUsdCents: number,
 *   minFirstOrderUsdCents: number,
 *   maxRewardsPerInviterPerWeek: number,
 *   evalDelayMs: number,
 * }>}
 */
export function readReferralEnvOverrides() {
  /** @type {Record<string, unknown>} */
  const o = {};

  const en = String(process.env.REFERRAL_ENABLED ?? '').trim();
  if (en === 'true' || en === '1') o.referralEnabled = true;
  else if (en === 'false' || en === '0') o.referralEnabled = false;

  const rewardUsd = String(process.env.REFERRAL_REWARD_USD ?? '').trim();
  if (rewardUsd) {
    const n = Number(rewardUsd);
    if (Number.isFinite(n) && n >= 0) {
      o.rewardAmountUsdCents = Math.round(n * 100);
    }
  }

  const budgetUsd = String(process.env.REFERRAL_WEEKLY_BUDGET_USD ?? '').trim();
  if (budgetUsd) {
    const n = Number(budgetUsd);
    if (Number.isFinite(n) && n >= 0) {
      o.weeklyBudgetUsdCents = Math.round(n * 100);
    }
  }

  const minUsd = String(process.env.REFERRAL_MIN_FIRST_ORDER_USD ?? '').trim();
  if (minUsd) {
    const n = Number(minUsd);
    if (Number.isFinite(n) && n >= 0) {
      o.minFirstOrderUsdCents = Math.round(n * 100);
    }
  }

  const wcap = String(
    process.env.REFERRAL_MAX_REWARDS_PER_INVITER_WEEK ?? '',
  ).trim();
  if (wcap) {
    const n = parseInt(wcap, 10);
    if (Number.isFinite(n) && n >= 0) {
      o.maxRewardsPerInviterPerWeek = n;
    }
  }

  const delayMs = String(process.env.REFERRAL_EVAL_DELAY_MS ?? '').trim();
  if (delayMs) {
    const n = parseInt(delayMs, 10);
    if (Number.isFinite(n) && n >= 0) {
      o.evalDelayMs = n;
    }
  }

  return /** @type {any} */ (o);
}
