/** @typedef {'mobile_topup' | 'data_package' | 'calling_credit'} Phase1ProductType */

export const PRODUCT_TYPES = Object.freeze({
  /** Phase 1 — Afghanistan mobile airtime (Reloadly / mock top-up). */
  MOBILE_TOPUP: 'mobile_topup',
  /** Reserved — not active in Phase 1. */
  DATA_PACKAGE: 'data_package',
  /** Reserved — not active in Phase 1. */
  CALLING_CREDIT: 'calling_credit',
  /** Legacy catalog values — map to MOBILE_TOPUP at resolver boundary. */
  AIRTIME: 'airtime',
  DATA_BUNDLE: 'data_bundle',
  INTERNATIONAL_CALL_WEEKLY: 'international_call_weekly',
});

/** @param {string} value */
export function isProductType(value) {
  return (
    value === PRODUCT_TYPES.MOBILE_TOPUP ||
    value === PRODUCT_TYPES.DATA_PACKAGE ||
    value === PRODUCT_TYPES.CALLING_CREDIT ||
    value === PRODUCT_TYPES.AIRTIME ||
    value === PRODUCT_TYPES.DATA_BUNDLE ||
    value === PRODUCT_TYPES.INTERNATIONAL_CALL_WEEKLY
  );
}

/** Active Stripe checkout product types (Phase 1). */
export function isCheckoutActiveProductType(value) {
  return value === PRODUCT_TYPES.MOBILE_TOPUP;
}
