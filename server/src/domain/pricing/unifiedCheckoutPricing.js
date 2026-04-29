import { env } from '../../config/env.js';
import { computeCheckoutPrice } from './pricingEngine.js';
import {
  resolveCatalogQuoteByPackageId,
  resolveAmountOnlyAirtimeQuote,
} from './catalogResolver.js';
import { ALLOWED_CHECKOUT_USD_CENTS } from '../../lib/allowedCheckout.js';
import { PRODUCT_TYPES } from './productTypes.js';
import { resolveCheckoutGovernmentTaxContext } from './taxEngine.js';

/**
 * Single entry for server checkout pricing (quote + session). Behavior matches legacy
 * resolveCheckoutPricing: same inputs → same outputs.
 *
 * @param {{ packageId?: string | null, amountCents?: number | null, riskBufferPercent: number, senderCountryCode: string, billingJurisdiction?: object | null }} input
 * @returns {import('./pricingEngine.js').PricingLineSuccess | import('./pricingEngine.js').PricingLineFailure | { ok: false, code: string, message: string }}
 */
export function resolveUnifiedCheckoutPricing(input) {
  const {
    packageId,
    amountCents,
    riskBufferPercent,
    senderCountryCode,
    billingJurisdiction,
  } = input;
  const taxCtx = resolveCheckoutGovernmentTaxContext(
    senderCountryCode,
    billingJurisdiction,
  );
  const governmentTaxBps = taxCtx.governmentTaxBps;

  if (packageId != null && String(packageId).trim()) {
    const quote = resolveCatalogQuoteByPackageId(String(packageId).trim());
    if (!quote) {
      return {
        ok: false,
        code: 'UNKNOWN_PACKAGE',
        message: 'Unknown packageId',
      };
    }
    if (quote.productType !== PRODUCT_TYPES.MOBILE_TOPUP) {
      return {
        ok: false,
        code: 'PHASE1_PRODUCT_DISABLED',
        message: 'This product is not available in Phase 1',
      };
    }
    return computeCheckoutPrice({
      providerCostCents: quote.providerCostCents,
      currency: 'usd',
      riskBufferPercent,
      targetRetailUsdCents: quote.faceValueCents,
      governmentTaxBps,
    });
  }

  const n = Number(amountCents);
  if (!Number.isInteger(n) || n < 50 || n > 500_000) {
    return {
      ok: false,
      code: 'invalid_amount',
      message: 'Invalid amountCents',
    };
  }
  if (!ALLOWED_CHECKOUT_USD_CENTS.has(n)) {
    return {
      ok: false,
      code: 'invalid_amount',
      message: 'Amount not in allowed price list',
    };
  }

  const q = resolveAmountOnlyAirtimeQuote(
    n,
    env.pricingAmountOnlyProviderBps,
  );
  return computeCheckoutPrice({
    providerCostCents: q.providerCostCents,
    currency: 'usd',
    riskBufferPercent,
    targetRetailUsdCents: n,
    governmentTaxBps,
  });
}
