import { resolveUnifiedCheckoutPricing } from './unifiedCheckoutPricing.js';

/**
 * Server-only checkout pricing: never trust client-supplied amounts.
 *
 * @param {{ packageId?: string | null, amountCents?: number | null, riskBufferPercent: number, senderCountryCode: string, billingJurisdiction?: object | null }} input
 * @returns {import('./pricingEngine.js').PricingLineSuccess | import('./pricingEngine.js').PricingLineFailure | { ok: false, code: string, message: string }}
 */
export function resolveCheckoutPricing(input) {
  return resolveUnifiedCheckoutPricing(input);
}
