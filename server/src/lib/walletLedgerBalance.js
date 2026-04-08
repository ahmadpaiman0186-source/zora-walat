import { DEFAULT_WALLET_USD_CENTS } from '../constants/walletConstants.js';
import { USER_WALLET_MAIN_BALANCE_LEDGER_REASONS } from '../constants/walletLedgerReasons.js';

/**
 * Expected `UserWallet.balanceUsdCents` from ledger rows whose `reason` is in
 * {@link USER_WALLET_MAIN_BALANCE_LEDGER_REASONS} only (main / spendable bucket).
 *
 * @param {import('@prisma/client').Prisma.TransactionClient | import('@prisma/client').PrismaClient} db
 * @param {string} userId
 */
export async function computeMainBalanceUsdCentsFromLedger(db, userId) {
  const rows = await db.userWalletLedgerEntry.groupBy({
    by: ['direction'],
    where: {
      userId,
      reason: { in: [...USER_WALLET_MAIN_BALANCE_LEDGER_REASONS] },
    },
    _sum: { amountUsdCents: true },
  });
  let credits = 0;
  let debits = 0;
  for (const r of rows) {
    const s = r._sum.amountUsdCents ?? 0;
    if (r.direction === 'CREDIT') credits += s;
    else if (r.direction === 'DEBIT') debits += s;
  }
  return DEFAULT_WALLET_USD_CENTS + credits - debits;
}

/**
 * @deprecated Use {@link computeMainBalanceUsdCentsFromLedger} — name kept for grep stability.
 */
export const computeWalletBalanceUsdCentsFromLedger =
  computeMainBalanceUsdCentsFromLedger;

/**
 * Main-balance invariant only (promotional / other ledger reasons are out of scope).
 * @returns {Promise<{ ok: boolean, stored: number | null, computed: number, scope: 'main_balance_ledger' }>}
 */
export async function verifyWalletLedgerBalanceConsistency(db, userId) {
  const wallet = await db.userWallet.findUnique({ where: { userId } });
  const computed = await computeMainBalanceUsdCentsFromLedger(db, userId);
  if (!wallet) {
    return {
      ok: computed === DEFAULT_WALLET_USD_CENTS,
      stored: null,
      computed,
      scope: 'main_balance_ledger',
    };
  }
  return {
    ok: wallet.balanceUsdCents === computed,
    stored: wallet.balanceUsdCents,
    computed,
    scope: 'main_balance_ledger',
  };
}
