import { env } from '../../config/env.js';
import { computeCheckoutPrice } from './pricingEngine.js';
import {
  resolveCatalogQuoteByPackageId,
  resolveAmountOnlyAirtimeQuote,
} from './catalogResolver.js';
import { ALLOWED_CHECKOUT_USD_CENTS } from '../../lib/allowedCheckout.js';

/**
 * Server-only checkout pricing: never trust client-supplied amounts for packages.
 * Amount-only path: allowed preset list → airtime wholesale from env ratio.
 *
 * @param {{ packageId?: string | null, amountUsdCents?: number | null }} input
 * @returns {import('./pricingEngine.js').PricingSuccess | import('./pricingEngine.js').PricingFailure | { ok: false, code: string, message: string }}
 */
export function resolveCheckoutPricing(input) {
  const { packageId, amountUsdCents } = input;

  if (packageId != null && String(packageId).trim()) {
    const quote = resolveCatalogQuoteByPackageId(String(packageId).trim());
    if (!quote) {
      return {
        ok: false,
        code: 'UNKNOWN_PACKAGE',
        message: 'Unknown packageId',
      };
    }
    return computeCheckoutPrice({
      productType: quote.productType,
      providerCostCents: quote.providerCostCents,
      currency: 'usd',
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
    productType: q.productType,
    providerCostCents: q.providerCostCents,
    currency: 'usd',
  });
}
