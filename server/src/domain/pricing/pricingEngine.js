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
 * Transparent customer charge:
 *   product value (recipient) + government sales tax (sender) + Zora-Walat service fee = total charged.
 * COGS-side tax/FX buffers are internal only and do not reduce recipient value.
 *
 * @param {object} input
 * @param {number} input.providerCostCents
 * @param {number} input.riskBufferPercent Sender-country risk as % of provider cost.
 * @param {string} [input.currency]
 * @param {number} input.targetRetailUsdCents Product value to recipient (USD cents); from catalog face or allowed ladder amount.
 * @param {number} [input.governmentTaxBps] Government sales tax on product value (0–10000), from sender country config.
 */
export function computeCheckoutPrice(input) {
  const {
    providerCostCents,
    riskBufferPercent,
    currency,
    targetRetailUsdCents,
    governmentTaxBps: rawGovTaxBps,
  } = input;

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

  const P = Number(targetRetailUsdCents);
  if (!Number.isInteger(P) || P <= 0) {
    return {
      ok: false,
      code: 'INVALID_TARGET_RETAIL',
      message: 'targetRetailUsdCents must be a positive integer (USD cents)',
    };
  }

  let govTaxBps = 0;
  if (rawGovTaxBps != null) {
    const g = Number(rawGovTaxBps);
    if (!Number.isFinite(g) || g < 0 || g > 10000) {
      return {
        ok: false,
        code: 'INVALID_GOVERNMENT_TAX_BPS',
        message: 'governmentTaxBps must be between 0 and 10000',
      };
    }
    govTaxBps = Math.floor(g);
  }

  const fees = getPricingFeeConfig();
  const fxOnlyCents = Math.round((providerCostCents * fees.fxBps) / 10000);
  /** Internal: tax buffer on provider COGS (not customer sales tax). */
  const providerCostTaxBufferCents = Math.round(
    (providerCostCents * fees.taxBps) / 10000,
  );
  const fxBufferCents = fxOnlyCents + providerCostTaxBufferCents;

  const riskPct =
    typeof riskBufferPercent === 'number' && Number.isFinite(riskBufferPercent)
      ? Math.max(0, riskBufferPercent)
      : 0;
  const riskBufferCents = Math.round((providerCostCents * riskPct) / 100);

  const landed = landedCogsCents(
    providerCostCents,
    fxOnlyCents,
    providerCostTaxBufferCents,
    riskBufferCents,
  );

  const minBp = Math.round(env.phase1MinMarginPercent * 100);

  const minCheckout = env.phase1MinCheckoutUsdCents;
  const allowSubMin = env.phase1AllowBelowMinimumOrders;

  const stripeBps = fees.stripeFeeBps;
  const stripeFixed = fees.stripeFixedCents;

  const customerGovernmentTaxCents = Math.round((P * govTaxBps) / 10000);

  const maxFeeSearch = 2_000_000;

  /**
   * Floor for the customer-visible Zora service fee (integer cents). When wholesale bps
   * is too low, margin can be satisfied with fee=0; the floor still requires a line item.
   * Derives from env.phase1MinZoraServiceFeeBps (0 = no floor; default 100 = 1% of P).
   */
  const minZoraFeeBps = Math.max(
    0,
    Math.min(10000, Math.floor(env.phase1MinZoraServiceFeeBps)),
  );
  const minZoraServiceFeeCents = Math.min(
    maxFeeSearch,
    minZoraFeeBps > 0 ? Math.max(1, Math.ceil((P * minZoraFeeBps) / 10000)) : 0,
  );

  for (let feeCents = minZoraServiceFeeCents; feeCents <= maxFeeSearch; feeCents += 1) {
    const finalCents = P + customerGovernmentTaxCents + feeCents;
    if (!allowSubMin && finalCents < minCheckout) {
      continue;
    }
    const netCents = netProfitCents(
      finalCents,
      landed,
      stripeBps,
      stripeFixed,
    );
    const marginBp = marginBpFromNet(finalCents, netCents);
    if (marginBp < minBp) {
      continue;
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
      continue;
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
          providerCostCents +
            stripeComponentCents +
            fxBufferCents +
            riskBufferCents,
        ),
        appliedMarginPercent: marginBp / 100,
        appliedProfitAbsolute: centsToUsdNumber(additiveTargetProfit),
        finalPrice: centsToUsdNumber(finalCents),
        estimatedProfit: centsToUsdNumber(verifyNet),
        currency: 'usd',
        finalPriceCents: finalCents,
        providerCostCents,
        fxBufferCents,
        riskBufferCents,
        stripeFeeEstimateCents: stripeComponentCents,
        targetProfitCents: additiveTargetProfit,
        projectedNetMarginBp: marginBp,
        taxBufferCents: providerCostTaxBufferCents,
        fxOnlyCents,
        customerProductValueCents: P,
        customerGovernmentTaxCents,
        customerZoraServiceFeeCents: feeCents,
      },
    };
  }

  return {
    ok: false,
    code: 'MARGIN_BELOW_FLOOR',
    message: 'Checkout rejected: projected margin below minimum threshold',
  };
}
