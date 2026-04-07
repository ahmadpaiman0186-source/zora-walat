import { env } from '../../config/env.js';
import { computeCheckoutPrice } from './pricingEngine.js';
import {
  resolveCatalogQuoteByPackageId,
  resolveAmountOnlyAirtimeQuote,
} from './catalogResolver.js';
import { ALLOWED_CHECKOUT_USD_CENTS } from '../../lib/allowedCheckout.js';
import { PRODUCT_TYPES } from './productTypes.js';

/**
 * Server-only checkout pricing: never trust client-supplied amounts.
 *
 * @param {{ packageId?: string | null, amountUsdCents?: number | null, riskBufferPercent: number }} input
 * @returns {import('./pricingEngine.js').PricingLineSuccess | import('./pricingEngine.js').PricingLineFailure | { ok: false, code: string, message: string }}
 */
export function resolveCheckoutPricing(input) {
  const { packageId, amountUsdCents, riskBufferPercent } = input;

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
    });
  }

  const n = Number(amountUsdCents);
  if (!Number.isInteger(n) || n < 50 || n > 500_000) {
    return {
      ok: false,
      code: 'INVALID_AMOUNT',
      message: 'Invalid amountUsdCents',
    };
  }
  if (!ALLOWED_CHECKOUT_USD_CENTS.has(n)) {
    return {
      ok: false,
      code: 'AMOUNT_NOT_ALLOWED',
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
  });
}
