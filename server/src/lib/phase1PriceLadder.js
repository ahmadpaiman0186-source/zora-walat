/**
 * Single permanent Phase 1 customer-facing USD ladder (cents).
 * Used by airtime SKUs, client catalogs, and checkout allow-lists — must stay aligned.
 */
export const PHASE1_LADDER_USD_CENTS = Object.freeze([
  200, 300, 500, 700, 900, 1100, 1300, 1500, 2000, 2500,
]);

export function isPhase1LadderUsdCents(cents) {
  const n = Number(cents);
  if (!Number.isInteger(n)) return false;
  return PHASE1_LADDER_USD_CENTS.includes(n);
}
