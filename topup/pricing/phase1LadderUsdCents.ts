/**
 * Phase 1 USD retail ladder (cents). Must stay aligned with server `PHASE1_LADDER_USD_CENTS`
 * (`server/src/lib/phase1PriceLadder.js`) and Flutter `lib/core/pricing/phase1_ladder.dart`.
 */
export const PHASE1_LADDER_USD_CENTS = [
  200, 300, 500, 700, 900, 1100, 1300, 1500, 2000, 2500,
] as const;
