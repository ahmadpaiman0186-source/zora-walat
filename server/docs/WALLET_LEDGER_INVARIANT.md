# User wallet ledger vs `UserWallet` — scoped invariant

## Balance and points — writer inventory (audit)

| Surface | Field(s) | Writers / creators (this repo) | Ledger / notes |
|---------|----------|----------------------------------|----------------|
| Main spendable wallet | `UserWallet.balanceUsdCents` | `userWalletService.topup`, `userWalletService.topupIdempotent`; `getWalletState` seeds row via `upsert` **create** only | `UserWalletLedgerEntry` with `reason` ∈ main set (below) |
| Promotional wallet | `UserWallet.promotionalBalanceUsdCents` | `referralLifecycleService.js` inviter reward path | Same ledger table; `reason = referral_inviter_promotional_credit`; **not** in main-balance sum |
| Loyalty (separate product) | `User.loyaltyPointsTotal`, `FamilyGroup.totalPoints` | `loyaltyPointsService.grantLoyaltyPointsForDeliveredOrderInTx`; referral bonus branch in `referralLifecycleService.js` | `LoyaltyLedger` / `loyaltyPointsGrant` — **not** `UserWallet` |
| Referral code | `User.referralCode` | `referralCodeService.ensureUserReferralCode` | N/A (no money) |

Anything that credits **main** `balanceUsdCents` must go through **`userWalletService`** today so post-topup `verifyWalletLedgerBalanceConsistency` remains meaningful. If you add a new main-balance writer, extend `USER_WALLET_MAIN_BALANCE_LEDGER_REASONS` and this table.

## Main balance (spendable)

- **Field:** `UserWallet.balanceUsdCents`
- **Ledger rows that affect this invariant:** `reason` ∈ `USER_WALLET_MAIN_BALANCE_LEDGER_REASONS` (`wallet_topup`, `wallet_topup_legacy`). See `server/src/constants/walletLedgerReasons.js`.
- **Check:** `verifyWalletLedgerBalanceConsistency` / `computeMainBalanceUsdCentsFromLedger` sum **only** those reasons, then compare to `balanceUsdCents`. Promotional and other reasons **must not** appear in that sum (false positives avoided by scope, not by suppressing checks).

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
