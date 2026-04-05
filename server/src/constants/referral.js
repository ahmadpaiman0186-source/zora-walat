export const REFERRAL_STATUS = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  REWARDED: 'REWARDED',
  REWARD_PAUSED: 'REWARD_PAUSED',
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
