import { resolveGovernmentSalesTaxBps } from './senderCountryTax.js';
import {
  TAX_POLICY_VERSION,
  TAX_SOURCE_DESCRIPTOR,
} from './pricingPolicyVersions.js';

/**
 * External tax engine hooks (US-first + future Stripe Tax). Not enabled in Phase-1
 * runtimes; kept explicit so we never claim provider-backed US ZIP/state tax
 * from sender-country BPS alone.
 */
export const TAX_RESOLUTION_MODES = {
  /** BPS from PHASE1_GOVERNMENT_SALES_TAX_BPS_BY_SENDER; zero when map unset. */
  FALLBACK_ENV: 'fallback_env',
  /** Reserved — requires Stripe Tax (or other) registration. */
  STRIPE_TAX: 'stripe_tax',
  /** Optional manual / ops tables — not used for automatic quotes yet. */
  MANUAL: 'manual',
  NONE: 'none',
};

/** @typedef {{ countryCode?: string | null, stateOrRegion?: string | null, city?: string | null, postalCode?: string | null, hasAddressLine1?: boolean } | null} JurisdictionRecord */

/**
 * Tax resolution for checkout (Stage 1): delegates to existing sender-country bps map.
 * @param {string} senderCountryCode
 * @returns {number} basis points 0–10000
 */
export function resolveGovernmentSalesTaxBpsForCheckout(senderCountryCode) {
  return resolveGovernmentSalesTaxBps(senderCountryCode);
}

export function getTaxPolicyVersion() {
  return TAX_POLICY_VERSION;
}

export function getTaxSourceDescriptor() {
  return TAX_SOURCE_DESCRIPTOR;
}

/**
 * Full tax context for quotes, snapshots, and clients. Separates **Zora app fee** (see
 * pricingEngine) from **government tax on product** (customer-facing sales tax on P).
 *
 * - `jurisdictionAppliedToTax === false` means state/ZIP/city, if present, are stored for
 *   compliance / future engine only — the applied `governmentTaxBps` is still
 *   senderCountry-only in Phase-1 BPS v1.
 *
 * @param {string} senderCountryCode
 * @param {object | null | undefined} [billingJurisdiction] optional: country, state, city, postal, address (trimmed by caller)
 * @returns {{ governmentTaxBps: number, taxResolutionMode: string, billingJurisdiction: JurisdictionRecord, jurisdictionAppliedToTax: boolean, stripeTaxIntegration: 'disabled' | 'not_configured' }}
 */
export function resolveCheckoutGovernmentTaxContext(
  senderCountryCode,
  billingJurisdiction = undefined,
) {
  const governmentTaxBps =
    resolveGovernmentSalesTaxBpsForCheckout(senderCountryCode);
  const bj =
    billingJurisdiction && typeof billingJurisdiction === 'object'
      ? billingJurisdiction
      : null;
  const hasDetail =
    Boolean(bj) &&
    Boolean(
      bj.countryCode ||
        bj.stateOrRegion ||
        bj.city ||
        bj.postalCode ||
        bj.addressLine1,
    );
  /** Phase-1: BPS is never derived from state/ZIP — honest flag for UI. */
  const jurisdictionAppliedToTax = false;
  return {
    governmentTaxBps,
    taxResolutionMode: TAX_RESOLUTION_MODES.FALLBACK_ENV,
    billingJurisdiction: hasDetail
      ? {
          countryCode: bj.countryCode ?? null,
          stateOrRegion: bj.stateOrRegion ?? null,
          city: bj.city ?? null,
          postalCode: bj.postalCode ?? null,
          hasAddressLine1: Boolean(bj.addressLine1),
        }
      : null,
    jurisdictionAppliedToTax,
    stripeTaxIntegration: 'not_configured',
  };
}
