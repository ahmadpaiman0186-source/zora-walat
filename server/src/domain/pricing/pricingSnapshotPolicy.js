import {
  ORCHESTRATOR_VERSION,
  SNAPSHOT_SCHEMA_VERSION,
} from './pricingPolicyVersions.js';
import {
  getTaxPolicyVersion,
  getTaxSourceDescriptor,
  resolveCheckoutGovernmentTaxContext,
} from './taxEngine.js';
import { describeFeeResolution, getFeePolicyVersion } from './feeEngine.js';

/**
 * Extra keys merged into PaymentCheckout.pricingSnapshot (Json).
 * Same policy fields as quote `pricingMeta` (plus snapshotSchemaVersion).
 */
export function buildPricingPolicySnapshotFields() {
  return {
    orchestratorVersion: ORCHESTRATOR_VERSION,
    taxPolicyVersion: getTaxPolicyVersion(),
    feePolicyVersion: getFeePolicyVersion(),
    taxSource: getTaxSourceDescriptor(),
    snapshotSchemaVersion: SNAPSHOT_SCHEMA_VERSION,
  };
}

/** Public quote API sibling to pricingBreakdown (additive). */
export function buildPricingMeta(quoteContext) {
  const base = buildPricingPolicySnapshotFields();
  if (quoteContext == null) return base;
  const {
    senderCountryCode: senderCode,
    billingJurisdiction: bill,
  } = quoteContext;
  if (typeof senderCode !== 'string' || !senderCode.trim()) {
    return {
      ...base,
      feeResolutionSource: describeFeeResolution(),
    };
  }
  const t = resolveCheckoutGovernmentTaxContext(
    senderCode,
    bill ?? null,
  );
  return {
    ...base,
    feeResolutionSource: describeFeeResolution(),
    taxResolutionMode: t.taxResolutionMode,
    billingJurisdiction: t.billingJurisdiction,
    jurisdictionAppliedToTax: t.jurisdictionAppliedToTax,
    stripeTaxIntegration: t.stripeTaxIntegration,
  };
}
