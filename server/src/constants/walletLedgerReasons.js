/** Client idempotency-key top-up (`POST /api/wallet/topup` with UUID). */
export const USER_WALLET_LEDGER_REASON_WALLET_TOPUP = 'wallet_topup';

/** Legacy top-up without `Idempotency-Key` (deprecated path). */
export const USER_WALLET_LEDGER_REASON_WALLET_TOPUP_LEGACY = 'wallet_topup_legacy';

/**
 * Ledger rows with these `reason` values affect **main** spendable balance (`balanceUsdCents`).
 * Invariant: `balanceUsdCents === DEFAULT_SEED + Σ(CREDIT) − Σ(DEBIT)` over rows with these reasons only.
 */
export const USER_WALLET_MAIN_BALANCE_LEDGER_REASONS = [
  USER_WALLET_LEDGER_REASON_WALLET_TOPUP,
  USER_WALLET_LEDGER_REASON_WALLET_TOPUP_LEGACY,
];

/**
 * Promotional bucket (`promotionalBalanceUsdCents`); does **not** move main balance.
 * Same append-only table for audit; excluded from main-balance invariant.
 */
export const USER_WALLET_LEDGER_REASON_REFERRAL_INVITER_PROMOTIONAL =
  'referral_inviter_promotional_credit';
