import { prisma } from '../../db.js';

const DEFAULT_USD_CENTS = 10000;

/**
 * Per-user wallet in PostgreSQL — safe for multiple app instances (no in-memory Map).
 */
export async function getWalletState(userId) {
  const row = await prisma.userWallet.upsert({
    where: { userId },
    create: {
      userId,
      balanceUsdCents: DEFAULT_USD_CENTS,
      currency: 'USD',
    },
    update: {},
  });
  return {
    balance: row.balanceUsdCents / 100,
    currency: row.currency,
  };
}

export async function topup(userId, amountUsd) {
  const n = Number(amountUsd);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error('amount must be a positive number');
  }
  const addCents = Math.round(n * 100);
  await prisma.userWallet.upsert({
    where: { userId },
    create: {
      userId,
      balanceUsdCents: DEFAULT_USD_CENTS + addCents,
      currency: 'USD',
    },
    update: {
      balanceUsdCents: { increment: addCents },
    },
  });
  return getWalletState(userId);
}
