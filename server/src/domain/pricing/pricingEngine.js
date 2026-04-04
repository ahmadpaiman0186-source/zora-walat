import { getMarginRule } from './marginRules.js';
import { getPricingFeeConfig } from './pricingConfig.js';
import { centsToUsdNumber } from './money.js';
import { isProductType } from './productTypes.js';

/**
 * @typedef {object} PricingSuccess
 * @property {true} ok
 * @property {object} pricing
 * @property {import('./productTypes.js').ProductType} pricing.productType
 * @property {number} pricing.providerCost
 * @property {number} pricing.stripeFee
 * @property {number} pricing.fxCost
 * @property {number} pricing.taxCost
 * @property {number} pricing.totalCost
 * @property {number} pricing.appliedMarginPercent
 * @property {number} pricing.appliedProfitAbsolute
 * @property {number} pricing.finalPrice
 * @property {number} pricing.estimatedProfit
 * @property {string} pricing.currency
 * @property {number} pricing.finalPriceCents
 */

/**
 * @typedef {object} PricingFailure
 * @property {false} ok
 * @property {string} code
 * @property {string} message
 */

/**
 * Stripe processing fee on the charged amount (integer cents).
 * @param {number} finalCents
 * @param {number} stripeBps
 * @param {number} stripeFixedCents
 */
function stripeFeeCents(finalCents, stripeBps, stripeFixedCents) {
  return Math.round((finalCents * stripeBps) / 10000) + stripeFixedCents;
}

/**
 * Solve finalCents = cCents + targetProfit + stripeFee(finalCents).
 * @param {{ cCents: number, profitCents: number, stripeBps: number, stripeFixedCents: number }} p
 */
function solveFinalPriceCents(p) {
  const { cCents, profitCents, stripeBps, stripeFixedCents } = p;
  let f = cCents + profitCents + stripeFixedCents;
  for (let i = 0; i < 32; i += 1) {
    const fee = stripeFeeCents(f, stripeBps, stripeFixedCents);
    const next = cCents + profitCents + fee;
    if (next === f) return f;
    f = next;
  }
  while (
    f - stripeFeeCents(f, stripeBps, stripeFixedCents) <
    cCents + profitCents
  ) {
    f += 1;
  }
  return f;
}

/**
 * @param {object} input
 * @param {import('./productTypes.js').ProductType} input.productType
 * @param {number} input.providerCostCents Must be positive integer (USD cents).
 * @param {string} input.currency Only `usd` supported for now.
 * @returns {PricingSuccess | PricingFailure}
 */
export function computeCheckoutPrice(input) {
  const { productType, providerCostCents, currency } = input;

  if (currency !== 'usd') {
    return {
      ok: false,
      code: 'UNSUPPORTED_CURRENCY',
      message: 'Only usd is supported for checkout pricing',
    };
  }

  if (!isProductType(productType)) {
    return {
      ok: false,
      code: 'INVALID_PRODUCT_TYPE',
      message: 'Unknown productType',
    };
  }

  if (!Number.isInteger(providerCostCents) || providerCostCents <= 0) {
    return {
      ok: false,
      code: 'INVALID_PROVIDER_COST',
      message: 'providerCostCents must be a positive integer (USD cents)',
    };
  }

  const fees = getPricingFeeConfig();
  const fxCostCents = Math.round((providerCostCents * fees.fxBps) / 10000);
  const taxCostCents = Math.round((providerCostCents * fees.taxBps) / 10000);
  /** Cost base for margin % (excludes Stripe; Stripe solved on final charge). */
  const cCents = providerCostCents + fxCostCents + taxCostCents;

  const rule = getMarginRule(productType);
  const pctProfitCents = Math.ceil((cCents * rule.marginPercent) / 100);
  const targetProfitCents = Math.max(pctProfitCents, rule.minimumProfitCents);

  let finalCents = solveFinalPriceCents({
    cCents,
    profitCents: targetProfitCents,
    stripeBps: fees.stripeFeeBps,
    stripeFixedCents: fees.stripeFixedCents,
  });

  let stripeComponentCents = stripeFeeCents(
    finalCents,
    fees.stripeFeeBps,
    fees.stripeFixedCents,
  );

  let totalCostCents =
    providerCostCents + stripeComponentCents + fxCostCents + taxCostCents;
  let estimatedProfitCents = finalCents - totalCostCents;

  /** Integer-cent rounding on Stripe fee can shave 1¢ off net profit — bump charge until safe. */
  for (let guard = 0; guard < 500; guard += 1) {
    if (
      finalCents > totalCostCents &&
      estimatedProfitCents >= rule.minimumProfitCents
    ) {
      break;
    }
    finalCents += 1;
    stripeComponentCents = stripeFeeCents(
      finalCents,
      fees.stripeFeeBps,
      fees.stripeFixedCents,
    );
    totalCostCents =
      providerCostCents + stripeComponentCents + fxCostCents + taxCostCents;
    estimatedProfitCents = finalCents - totalCostCents;
  }

  if (finalCents <= totalCostCents) {
    return {
      ok: false,
      code: 'PRICE_AT_OR_BELOW_COST',
      message: 'Computed price would not cover all costs',
    };
  }

  if (estimatedProfitCents < rule.minimumProfitCents) {
    return {
      ok: false,
      code: 'PROFIT_BELOW_MINIMUM',
      message: 'Computed profit is below the minimum safe threshold',
    };
  }

  return {
    ok: true,
    pricing: {
      productType,
      providerCost: centsToUsdNumber(providerCostCents),
      stripeFee: centsToUsdNumber(stripeComponentCents),
      fxCost: centsToUsdNumber(fxCostCents),
      taxCost: centsToUsdNumber(taxCostCents),
      totalCost: centsToUsdNumber(totalCostCents),
      appliedMarginPercent: rule.marginPercent,
      appliedProfitAbsolute: centsToUsdNumber(targetProfitCents),
      finalPrice: centsToUsdNumber(finalCents),
      estimatedProfit: centsToUsdNumber(estimatedProfitCents),
      currency: 'usd',
      finalPriceCents: finalCents,
    },
  };
}
