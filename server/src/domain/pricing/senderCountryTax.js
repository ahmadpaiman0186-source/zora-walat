import { env } from '../../config/env.js';

/**
 * Government sales tax (sender country) on the **product value** only, in basis points (0–10000).
 *
 * When `PHASE1_GOVERNMENT_SALES_TAX_BPS_BY_SENDER` is unset or `{}`, **every** sender code resolves
 * to **0 bps** — that is the configured default, not a calculation error.
 */
export function resolveGovernmentSalesTaxBps(senderCountryCode) {
  const code = String(senderCountryCode ?? '').trim().toUpperCase();
  if (!code) return 0;
  const map = env.phase1GovernmentSalesTaxBpsBySender;
  if (!map || typeof map !== 'object') return 0;
  const bps = map[code];
  if (bps == null || !Number.isFinite(Number(bps))) return 0;
  return Math.max(0, Math.min(10000, Math.floor(Number(bps))));
}
