import { env } from '../../config/env.js';
import { getPricingFeeConfig } from './pricingConfig.js';
import { centsToUsdNumber } from './money.js';
import { PRODUCT_TYPES } from './productTypes.js';

/**
 * Stripe processing fee on the charged amount (integer cents).
 */
function stripeFeeCents(finalCents, stripeBps, stripeFixedCents) {
  return Math.round((finalCents * stripeBps) / 10000) + stripeFixedCents;
}

/**
 * Landed COGS before Stripe: provider + buffers (fx/tax/risk on provider).
 */
function landedCogsCents(provider, fx, tax, risk) {
  return provider + fx + tax + risk;
}

/**
 * Net operating cents on the charge after Stripe fee and landed COGS.
 */
function netProfitCents(finalCents, landed, stripeBps, stripeFixed) {
  return (
    finalCents -
    stripeFeeCents(finalCents, stripeBps, stripeFixed) -
    landed
  );
}

function marginBpFromNet(finalCents, netCents) {
  if (finalCents <= 0) return 0;
  return Math.floor((netCents * 10000) / finalCents);
}

/**
 * Phase 1 mobile top-up only. Server-priced; never trust client amounts.
 *
 * @param {object} input
 * @param {number} input.providerCostCents
 * @param {number} input.riskBufferPercent Sender-country risk as % of provider cost.
 * @param {string} [input.currency]
 */
export function computeCheckoutPrice(input) {
  const { providerCostCents, riskBufferPercent, currency } = input;

  if (currency != null && currency !== 'usd') {
    return {
      ok: false,
      code: 'UNSUPPORTED_CURRENCY',
      message: 'Only usd is supported for checkout pricing',
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
  const fxOnlyCents = Math.round((providerCostCents * fees.fxBps) / 10000);
  const taxCents = Math.round((providerCostCents * fees.taxBps) / 10000);
  /** Persisted as fx_buffer: regulatory/tax + FX cushion (see pricingSnapshot for split). */
  const fxBufferCents = fxOnlyCents + taxCents;

  const riskPct =
    typeof riskBufferPercent === 'number' && Number.isFinite(riskBufferPercent)
      ? Math.max(0, riskBufferPercent)
      : 0;
  const riskBufferCents = Math.round((providerCostCents * riskPct) / 100);

  const landed = landedCogsCents(
    providerCostCents,
    fxOnlyCents,
    taxCents,
    riskBufferCents,
  );

  const minBp = Math.round(env.phase1MinMarginPercent * 100);
  const targetBp = Math.round(env.phase1TargetMarginPercent * 100);

  const minCheckout = env.phase1MinCheckoutUsdCents;
  const allowSubMin = env.phase1AllowBelowMinimumOrders;

  const stripeBps = fees.stripeFeeBps;
  const stripeFixed = fees.stripeFixedCents;

  const minFloor = Math.max(
    minCheckout,
    landed +
      stripeFeeCents(minCheckout, stripeBps, stripeFixed) +
      1,
  );

  /**
   * Smallest final charge such that net margin (bp) >= [floorBp].
   */
  function bestFinalAtOrAbove(floorBp, startCents) {
    const cap = Math.max(startCents * 50, landed + 500_000);
    for (let finalC = startCents; finalC <= cap; finalC += 1) {
      const net = netProfitCents(finalC, landed, stripeBps, stripeFixed);
      const bp = marginBpFromNet(finalC, net);
      if (bp >= floorBp) {
        return { finalCents: finalC, netCents: net, marginBp: bp };
      }
    }
    return null;
  }

  let picked =
    bestFinalAtOrAbove(targetBp, minFloor) ?? bestFinalAtOrAbove(minBp, minFloor);

  if (!picked) {
    return {
      ok: false,
      code: 'MARGIN_BELOW_FLOOR',
      message:
        'Checkout rejected: projected margin below minimum threshold',
    };
  }

  let { finalCents, netCents, marginBp } = picked;

  if (!allowSubMin && finalCents < minCheckout) {
    return {
      ok: false,
      code: 'CHECKOUT_BELOW_MINIMUM',
      message: `Checkout rejected: minimum order is $${(minCheckout / 100).toFixed(2)} USD`,
    };
  }

  const stripeComponentCents = stripeFeeCents(
    finalCents,
    stripeBps,
    stripeFixed,
  );

  const additiveTargetProfit =
    finalCents -
    providerCostCents -
    stripeComponentCents -
    fxBufferCents -
    riskBufferCents;

  const verifyNet = netProfitCents(
    finalCents,
    landed,
    stripeBps,
    stripeFixed,
  );
  if (verifyNet < 0 || marginBpFromNet(finalCents, verifyNet) < minBp) {
    return {
      ok: false,
      code: 'MARGIN_BELOW_FLOOR',
      message:
        'Checkout rejected: projected margin below minimum threshold',
    };
  }

  return {
    ok: true,
    pricing: {
      productType: PRODUCT_TYPES.MOBILE_TOPUP,
      providerCost: centsToUsdNumber(providerCostCents),
      stripeFee: centsToUsdNumber(stripeComponentCents),
      fxCost: centsToUsdNumber(fxBufferCents),
      taxCost: centsToUsdNumber(0),
      totalCost: centsToUsdNumber(
        providerCostCents + stripeComponentCents + fxBufferCents + riskBufferCents,
      ),
      appliedMarginPercent: marginBp / 100,
      appliedProfitAbsolute: centsToUsdNumber(additiveTargetProfit),
      finalPrice: centsToUsdNumber(finalCents),
      estimatedProfit: centsToUsdNumber(netCents),
      currency: 'usd',
      finalPriceCents: finalCents,
      providerCostCents,
      fxBufferCents,
      riskBufferCents,
      stripeFeeEstimateCents: stripeComponentCents,
      targetProfitCents: additiveTargetProfit,
      projectedNetMarginBp: marginBp,
      taxBufferCents: taxCents,
      fxOnlyCents,
    },
  };
}
