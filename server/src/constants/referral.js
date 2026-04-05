export const REFERRAL_STATUS = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  REWARDED: 'REWARDED',
  /** Terminal: budget, fraud, caps — legacy rows may still read REWARD_PAUSED. */
  REJECTED: 'REJECTED',
  REWARD_PAUSED: 'REWARD_PAUSED',
};

export const REFERRAL_REJECTION_REASON = {
  BUDGET: 'referral_budget_exceeded',
  FRAUD: 'referral_fraud_detected',
  INVITER_WEEKLY_CAP: 'inviter_weekly_reward_cap',
  INVITER_LIFETIME_CAP: 'inviter_reward_cap',
  ABUSE_SOFT: 'abuse_review_soft_flags',
};

export const REFERRAL_REWARD_TX_STATUS = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
};

/** Internal analytics / risk only — never expose raw keys to clients. */
export const REFERRAL_FRAUD_FLAG = {
  SUSPICIOUS_REFERRAL: 'suspicious_referral',
  DUPLICATE_IDENTITY_SIGNAL: 'duplicate_identity_signal',
  REPEATED_PATTERN: 'repeated_pattern',
};
