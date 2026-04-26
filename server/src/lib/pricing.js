import { PHASE1_LADDER_USD_CENTS } from './phase1PriceLadder.js';

/**
 * Wholesale COGS models aligned 1:1 with [PHASE1_LADDER_USD_CENTS] (operator quotes / policy).
 */
const PROVIDER_USD_CENTS_BY_LADDER_INDEX = [
  80, 120, 220, 350, 470, 770, 1000, 1200, 1640, 2200,
];

const MINUTES_BY_LADDER_INDEX = [2, 3, 5, 7, 9, 11, 13, 15, 20, 25];

function buildAirtimeSkus() {
  if (PHASE1_LADDER_USD_CENTS.length !== PROVIDER_USD_CENTS_BY_LADDER_INDEX.length) {
    throw new Error('AIRTIME_SKUS: ladder and provider economics length mismatch');
  }
  return PHASE1_LADDER_USD_CENTS.map((retailUsdCents, i) => ({
    idSuffix: `usd_${retailUsdCents}`,
    minutes: MINUTES_BY_LADDER_INDEX[i],
    retailUsdCents,
    providerUsdCents: PROVIDER_USD_CENTS_BY_LADDER_INDEX[i],
  }));
}

/**
 * Single source of truth for Phase 1 airtime SKUs (must match app catalog / GET /catalog/airtime).
 * Retail face values in USD cents; providerUsdCents are wholesale COGS models (operator quotes / policy).
 * Minimum checkout floor: see PHASE1_MIN_CHECKOUT_USD_CENTS (must be ≤ smallest retail SKU).
 */
export const AIRTIME_SKUS = buildAirtimeSkus();

const skuByProductId = new Map();

export function registerSkusForOperator(operatorKey) {
  for (const row of AIRTIME_SKUS) {
    const id = `${operatorKey}_${row.idSuffix}`;
    skuByProductId.set(id, { ...row, operatorKey, id });
  }
}

['roshan', 'mtn', 'etisalat', 'afghanWireless'].forEach(registerSkusForOperator);

export function getAirtimeSku(productId) {
  return skuByProductId.get(productId) || null;
}

export function listAirtimeForOperator(operatorKey) {
  return AIRTIME_SKUS.map((row) => ({
    id: `${operatorKey}_${row.idSuffix}`,
    minutes: row.minutes,
    retailUsdCents: row.retailUsdCents,
  }));
}
