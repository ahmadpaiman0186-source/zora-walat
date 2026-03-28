/** In-memory mock wallet for MVP (resets on server restart). */
let balanceUsd = 100;

export function getWalletState() {
  return { balance: balanceUsd, currency: 'USD' };
}

export function topup(amountUsd) {
  const n = Number(amountUsd);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error('amount must be a positive number');
  }
  balanceUsd = Math.round((balanceUsd + n) * 100) / 100;
  return getWalletState();
}
