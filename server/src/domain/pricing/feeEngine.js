import { FEE_POLICY_VERSION } from './pricingPolicyVersions.js';

export function getFeePolicyVersion() {
  return FEE_POLICY_VERSION;
}

/** Stable description for receipts / audit (fee cents still come from pricingEngine). */
export function describeFeeResolution() {
  return 'pricingEngine.computeCheckoutPrice: margin search with PHASE1_MIN_ZORA_SERVICE_FEE_BPS floor (see env.js)';
}
