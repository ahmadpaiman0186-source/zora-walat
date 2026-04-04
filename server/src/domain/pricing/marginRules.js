import { PRODUCT_TYPES } from './productTypes.js';

/**
 * Default margin rules (USD). Extensible later: load by country/operator/provider key.
 * Profit candidate = max(ceil(C * marginPercent / 100), minimumProfitCents) where
 * C = provider + fx + tax (Stripe excluded; applied when solving final price).
 *
 * @typedef {{ marginPercent: number, minimumProfitCents: number }} MarginRule
 */

/** @type {Record<import('./productTypes.js').ProductType, MarginRule>} */
const DEFAULT_RULES = {
  [PRODUCT_TYPES.AIRTIME]: {
    marginPercent: 10,
    minimumProfitCents: 50,
  },
  [PRODUCT_TYPES.DATA_BUNDLE]: {
    marginPercent: 12,
    minimumProfitCents: 100,
  },
  [PRODUCT_TYPES.INTERNATIONAL_CALL_WEEKLY]: {
    marginPercent: 20,
    minimumProfitCents: 150,
  },
};

/**
 * @param {import('./productTypes.js').ProductType} productType
 * @param {object} [_context] Reserved for country / operator / provider overrides.
 * @returns {MarginRule}
 */
export function getMarginRule(productType, _context = undefined) {
  const rule = DEFAULT_RULES[productType];
  if (!rule) {
    throw new Error(`Unknown productType for margin: ${productType}`);
  }
  return rule;
}
