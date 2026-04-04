/**
 * Mirrors Flutter [TelecomCatalogLocal] + [PricingEngine] / [ProductTier] for server trust.
 */

const TIER_MARGIN = { small: 0.07, medium: 0.08, large: 0.1 };

function retailCents(baseCostUsdCents, tier) {
  if (baseCostUsdCents <= 0) return 0;
  return Math.round(baseCostUsdCents * (1 + TIER_MARGIN[tier]));
}

const OPERATORS = ['roshan', 'mtn', 'etisalat', 'afghanWireless'];

/** [suffix, baseCostUsdCents, tier] — must stay in sync with `lib/features/telecom/data/telecom_catalog_local.dart`. */
const DATA_ROWS = [
  ['d250', 42, 'small'],
  ['d1', 139, 'small'],
  ['w3', 418, 'medium'],
  ['w8', 989, 'medium'],
  ['m12', 1488, 'large'],
  ['m35', 3990, 'large'],
];

const retailByProductId = new Map();
/** @type {Map<string, number>} */
const providerCostByProductId = new Map();

for (const op of OPERATORS) {
  for (const [suffix, base, tier] of DATA_ROWS) {
    const id = `${op}_${suffix}`;
    retailByProductId.set(id, retailCents(base, tier));
    providerCostByProductId.set(id, base);
  }
}

export function getDataPackageRetailUsdCents(productId) {
  return retailByProductId.get(productId) ?? null;
}

/** Wholesale / provider cost in USD cents (matches Flutter base before tier margin). */
export function getDataPackageProviderCostUsdCents(productId) {
  return providerCostByProductId.get(productId) ?? null;
}

export function allDataPackageRetailUsdCents() {
  return [...new Set(retailByProductId.values())];
}
