/**
 * Single source of truth for airtime SKUs (must match app catalog).
 * Server validates PaymentIntent amount against these rows (anti-tamper).
 */
export const AIRTIME_SKUS = [
  {
    idSuffix: 'air_10m',
    minutes: 10,
    retailUsdCents: 500,
    /** Wholesale — set from operator quotes / provider API. */
    providerUsdCents: 440,
  },
  {
    idSuffix: 'air_15m',
    minutes: 15,
    retailUsdCents: 750,
    providerUsdCents: 660,
  },
  {
    idSuffix: 'air_25m',
    minutes: 25,
    retailUsdCents: 1000,
    providerUsdCents: 880,
  },
  {
    idSuffix: 'air_50m',
    minutes: 50,
    retailUsdCents: 1500,
    providerUsdCents: 1320,
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
