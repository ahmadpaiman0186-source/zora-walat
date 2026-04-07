/**
 * Single source of truth for airtime SKUs (must match app catalog).
 * Phase 1: retail face value ≥ $10 USD (see PHASE1_MIN_CHECKOUT_USD_CENTS).
 */
export const AIRTIME_SKUS = [
  {
    idSuffix: 'air_25m',
    minutes: 25,
    retailUsdCents: 1000,
    /** Wholesale — set from operator quotes / provider API. */
    providerUsdCents: 880,
  },
  {
    idSuffix: 'air_50m',
    minutes: 50,
    retailUsdCents: 1500,
    providerUsdCents: 1320,
  },
  {
    idSuffix: 'air_100m',
    minutes: 100,
    retailUsdCents: 2000,
    providerUsdCents: 1760,
  },
  {
    idSuffix: 'air_125m',
    minutes: 125,
    retailUsdCents: 2500,
    providerUsdCents: 2200,
  },
];

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
