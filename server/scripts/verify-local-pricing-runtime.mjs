#!/usr/bin/env node
/**
 * Phase 1 money-path: in-process pricing (no running HTTP server).
 * Same engine as POST /checkout-pricing-quote: resolveCheckoutPricing → pricingBreakdownResponseBody.
 * Asserts integer identity: product + tax + fee === total.
 */
import '../bootstrap.js';
import { prisma } from '../src/db.js';
import { resolveCheckoutPricing } from '../src/domain/pricing/resolveCheckoutPricing.js';
import { pricingBreakdownResponseBody } from '../src/lib/checkoutPricingBreakdown.js';
import { buildPricingMeta } from '../src/domain/pricing/pricingSnapshotPolicy.js';

/** $2.00 — first rung on PHASE1_LADDER_USD_CENTS (see ENGINEERING_CHECKPOINT). */
const AMOUNT_CENTS = 200;
const SENDER = 'US';

const sender = await prisma.senderCountry.findUnique({
  where: { code: SENDER },
});
if (!sender || !sender.enabled) {
  console.error(
    'verify-local-pricing: need enabled sender country US in DB (migrate + seed).',
  );
  process.exit(1);
}

const priced = resolveCheckoutPricing({
  packageId: null,
  amountCents: AMOUNT_CENTS,
  riskBufferPercent: sender.riskBufferPercent,
  senderCountryCode: SENDER,
  billingJurisdiction: null,
});

if (!priced.ok) {
  console.error('verify-local-pricing: resolveCheckoutPricing failed', priced);
  process.exit(1);
}

const breakdown = pricingBreakdownResponseBody(priced.pricing);
const meta = buildPricingMeta({
  senderCountryCode: SENDER,
  billingJurisdiction: null,
});

const product = breakdown.productValueUsdCents;
const tax = breakdown.governmentTaxUsdCents;
const fee = breakdown.zoraServiceFeeUsdCents;
const total = breakdown.totalUsdCents;
const sumEqualsTotal = product + tax + fee === total;

const report = {
  product,
  tax,
  fee,
  total,
  feePolicyVersion: meta.feePolicyVersion,
  sumEqualsTotal,
  zoraServiceFeeUsdCents: fee,
  totalUsdCents: total,
  productValueUsdCents: product,
  governmentTaxUsdCents: tax,
};

console.log(JSON.stringify(report, null, 2));

if (!sumEqualsTotal) {
  process.exit(1);
}
if (fee == null || tax == null || product == null || total == null) {
  console.error('verify-local-pricing: null/undefined cent field');
  process.exit(1);
}

await prisma.$disconnect();
