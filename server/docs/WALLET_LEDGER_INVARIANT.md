# User wallet ledger vs `UserWallet` — scoped invariant

## Main balance (spendable)

- **Field:** `UserWallet.balanceUsdCents`
- **Writers in this repo:** `userWalletService.topup`, `userWalletService.topupIdempotent`, and `getWalletState` (seed only via upsert create).
- **Ledger rows that affect this invariant:** `reason` ∈ `USER_WALLET_MAIN_BALANCE_LEDGER_REASONS` (`wallet_topup`, `wallet_topup_legacy`). See `server/src/constants/walletLedgerReasons.js`.
- **Check:** `verifyWalletLedgerBalanceConsistency` / `computeMainBalanceUsdCentsFromLedger` sum **only** those reasons, then compare to `balanceUsdCents`.

`WALLET_STRICT_LEDGER_VERIFY=true` turns a post-topup mismatch on this scope into HTTP 500 (`wallet_ledger_invariant_violation`). Default remains off for safer rollout.

## Promotional bucket (non-main)

- **Field:** `UserWallet.promotionalBalanceUsdCents`
- **Writers:** referral inviter reward path in `referralLifecycleService.js` (increments promotional only).
- **Ledger:** append-only row with `reason = referral_inviter_promotional_credit`, `idempotencyKey = referral-reward:<referralId>`. `balanceAfterUsdCents` on the row is the **main** balance at grant time (unchanged by this credit). Excluded from the main-balance invariant above.

## DB trigger

- **`UPDATE`** on `UserWalletLedgerEntry` is rejected (append-only).
- **`DELETE`** is allowed so `User` cascade deletes can remove rows (no hidden balance effect if user is removed).

## Platform `Wallet` / `LedgerEntry`

Unrelated models (commission / Stripe); not part of this user-wallet invariant.
