/**
 * Mock / dev package economics (IDs must match mockRechargeProvider + Flutter).
 * Replace wholesale numbers with provider API quotes in production workflows.
 * @type {Record<string, { productType: import('./productTypes.js').ProductType, faceValueUsdCents: number, providerUsdCents: number }>}
 */
export const MOCK_PACKAGE_ECONOMICS = {
  mock_data_500mb: {
    productType: 'data_bundle',
    faceValueUsdCents: 499,
    providerUsdCents: 420,
  },
  mock_data_1gb: {
    productType: 'data_bundle',
    faceValueUsdCents: 1199,
    providerUsdCents: 1000,
  },
  mock_airtime_10: {
    productType: 'airtime',
    faceValueUsdCents: 1000,
    providerUsdCents: 900,
  },
  mock_airtime_25: {
    productType: 'airtime',
    faceValueUsdCents: 2500,
    providerUsdCents: 2250,
  },
  mock_intl_weekly: {
    productType: 'international_call_weekly',
    faceValueUsdCents: 999,
    providerUsdCents: 720,
  },
};
