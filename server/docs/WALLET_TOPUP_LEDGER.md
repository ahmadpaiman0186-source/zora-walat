# Wallet top-up: ledger, audit, and abuse controls

See **`WALLET_LEDGER_INVARIANT.md`** for the authoritative **main vs promotional** ledger scope and invariant rules.

## Summary

- Top-up paths write **`UserWalletLedgerEntry`** with reasons `wallet_topup` / `wallet_topup_legacy` and structured metadata (`channel`: `idempotent_topup` | `legacy_topup`).
- Post-top-up verification compares **`balanceUsdCents`** to the ledger sum over **main-balance reasons only** (not promotional referral rows).
- Rate limits: per-minute then 15m window on `POST /topup` (see `rateLimits.js` ordering comment).

## Commands

1. `npm run db:migrate`
2. `npm run verify:wallet-topup-idempotency`
3. `DEBUG_WALLET_TOPUP=true` for step traces in `userWalletService.js`

## Honest limits

- HTTP rate limits are in-process per Node unless Redis-backed stores are used.
- New `balanceUsdCents` writers **must** use a reason in `USER_WALLET_MAIN_BALANCE_LEDGER_REASONS` (or extend that list and the writer) to keep the invariant true under strict mode.
