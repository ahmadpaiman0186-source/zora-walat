/**
 * Stripe Checkout line items: sum of unit_amount × quantity must equal total charged (USD cents).
 * Omits zero-cent lines (Stripe rejects $0 items).
 *
 * @param {object} pricing — success object from [computeCheckoutPrice].pricing
 * @returns {object[]}
 */
export function buildStripeCheckoutLineItems(pricing) {
  const P = pricing.customerProductValueCents;
  const tax = pricing.customerGovernmentTaxCents;
  const fee = pricing.customerZoraServiceFeeCents;
  const total = pricing.finalPriceCents;
  if (
    !Number.isInteger(P) ||
    !Number.isInteger(tax) ||
    !Number.isInteger(fee) ||
    !Number.isInteger(total)
  ) {
    throw new Error('checkout pricing: missing integer cent fields');
  }
  if (P + tax + fee !== total) {
    throw new Error('checkout pricing: product + tax + fee !== total');
  }

  const items = [
    {
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Mobile airtime (recipient value)',
          description:
            'USD value delivered to the recipient mobile account (product value).',
        },
        unit_amount: P,
      },
      quantity: 1,
    },
  ];
  if (tax > 0) {
    items.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Government sales tax (sender jurisdiction)',
        },
        unit_amount: tax,
      },
      quantity: 1,
    });
  }
  if (fee > 0) {
    items.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Zora-Walat service fee',
        },
        unit_amount: fee,
      },
      quantity: 1,
    });
  }
  return items;
}

/**
 * @param {object} pricing — [computeCheckoutPrice].pricing
 */
export function pricingBreakdownResponseBody(pricing) {
  const pv = Math.round(Number(pricing.customerProductValueCents));
  const tx = Math.round(Number(pricing.customerGovernmentTaxCents));
  const fee = Math.round(Number(pricing.customerZoraServiceFeeCents));
  const tot = Math.round(Number(pricing.finalPriceCents));
  if (pv + tx + fee !== tot) {
    throw new Error(
      `checkout pricing breakdown: product+tax+fee !== total (${pv}+${tx}+${fee} !== ${tot})`,
    );
  }
  return {
    productValueUsdCents: pv,
    governmentTaxUsdCents: tx,
    zoraServiceFeeUsdCents: fee,
    totalUsdCents: tot,
    productValueUsd: roundUsd(pv),
    taxUsd: roundUsd(tx),
    serviceFeeUsd: roundUsd(fee),
    totalUsd: roundUsd(tot),
  };
}

function roundUsd(cents) {
  return Math.round(cents) / 100;
}

/**
 * Legacy rows: no customer breakdown in snapshot — treat entire charge as product value.
 * @param {number} amountUsdCents
 */
export function legacySingleLineBreakdown(amountUsdCents) {
  const n = Math.max(0, Math.floor(Number(amountUsdCents) || 0));
  return {
    productValueUsdCents: n,
    governmentTaxUsdCents: 0,
    zoraServiceFeeUsdCents: 0,
    totalUsdCents: n,
    productValueUsd: roundUsd(n),
    taxUsd: 0,
    serviceFeeUsd: 0,
    totalUsd: roundUsd(n),
  };
}

/**
 * @param {object | null | undefined} pricingSnapshot
 * @param {number} amountUsdCents — row total (Stripe)
 */
export function pricingBreakdownFromSnapshot(pricingSnapshot, amountUsdCents) {
  const snap =
    pricingSnapshot && typeof pricingSnapshot === 'object'
      ? pricingSnapshot
      : null;
  if (
    snap &&
    snap.customerProductValueUsdCents != null &&
    snap.customerGovernmentTaxUsdCents != null &&
    snap.customerZoraServiceFeeUsdCents != null &&
    snap.finalPriceUsdCents != null
  ) {
    const pv = Math.round(Number(snap.customerProductValueUsdCents));
    const tx = Math.round(Number(snap.customerGovernmentTaxUsdCents));
    const fee = Math.round(Number(snap.customerZoraServiceFeeUsdCents));
    const storedTotal = Math.round(Number(snap.finalPriceUsdCents));
    /** Authoritative total: sum of line items (strict int; matches engine + Stripe line items). */
    const lineTotal = pv + tx + fee;
    if (storedTotal !== lineTotal) {
      console.warn(
        JSON.stringify({
          event: 'pricing_snapshot_total_reconciled',
          storedTotal,
          lineTotal,
          msg: 'finalPriceUsdCents != product+tax+fee; using line sum for breakdown',
        }),
      );
    }
    return {
      productValueUsdCents: pv,
      governmentTaxUsdCents: tx,
      zoraServiceFeeUsdCents: fee,
      totalUsdCents: lineTotal,
      productValueUsd: roundUsd(pv),
      taxUsd: roundUsd(tx),
      serviceFeeUsd: roundUsd(fee),
      totalUsd: roundUsd(lineTotal),
    };
  }
  return legacySingleLineBreakdown(amountUsdCents);
}
