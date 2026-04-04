import { env } from '../../config/env.js';

/**
 * Stripe + FX + tax parameters for the pricing engine (server-side only).
 * FX/tax modeled as basis points of provider cost until per-country rules exist.
 */
export function getPricingFeeConfig() {
  return {
    stripeFeeBps: env.pricingStripeFeeBps,
    stripeFixedCents: env.pricingStripeFixedCents,
    fxBps: env.pricingFxBps,
    taxBps: env.pricingTaxBps,
  };
}
