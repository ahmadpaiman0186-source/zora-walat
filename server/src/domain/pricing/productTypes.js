/** @typedef {'airtime' | 'data_bundle' | 'international_call_weekly'} ProductType */

export const PRODUCT_TYPES = Object.freeze({
  AIRTIME: 'airtime',
  DATA_BUNDLE: 'data_bundle',
  INTERNATIONAL_CALL_WEEKLY: 'international_call_weekly',
});

/** @param {string} value */
export function isProductType(value) {
  return (
    value === PRODUCT_TYPES.AIRTIME ||
    value === PRODUCT_TYPES.DATA_BUNDLE ||
    value === PRODUCT_TYPES.INTERNATIONAL_CALL_WEEKLY
  );
}
