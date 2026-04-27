import assert from 'node:assert/strict';
import { test } from 'node:test';

import { resolveAmountOnlyAirtimeQuote } from '../src/domain/pricing/catalogResolver.js';
import { resolveCheckoutPricing } from '../src/domain/pricing/resolveCheckoutPricing.js';
import { resolveUnifiedCheckoutPricing } from '../src/domain/pricing/unifiedCheckoutPricing.js';
import { computeCheckoutPrice } from '../src/domain/pricing/pricingEngine.js';
import { pricingBreakdownFromSnapshot } from '../src/lib/checkoutPricingBreakdown.js';
import { buildPricingMeta } from '../src/domain/pricing/pricingSnapshotPolicy.js';

test('resolveCheckoutPricing matches resolveUnifiedCheckoutPricing (same reference path)', () => {
  const input = {
    amountCents: 500,
    senderCountryCode: 'US',
    riskBufferPercent: 1.25,
  };
  const a = resolveCheckoutPricing(input);
  const b = resolveUnifiedCheckoutPricing(input);
  assert.deepEqual(a, b);
});

test('resolveCheckoutPricing is stable for repeated calls (US 500)', () => {
  const input = {
    amountCents: 500,
    senderCountryCode: 'US',
    riskBufferPercent: 1.25,
  };
  const a = resolveCheckoutPricing(input);
  const b = resolveCheckoutPricing(input);
  assert.deepEqual(a, b);
  assert.equal(a.ok, true);
  if (a.ok && b.ok) {
    assert.equal(a.pricing.finalPriceCents, b.pricing.finalPriceCents);
    assert.equal(
      a.pricing.customerGovernmentTaxCents,
      b.pricing.customerGovernmentTaxCents,
    );
  }
});

test('buildPricingMeta has stable Stage 1 keys', () => {
  const m = buildPricingMeta();
  assert.equal(m.orchestratorVersion, 1);
  assert.equal(m.snapshotSchemaVersion, 1);
  assert.equal(typeof m.taxPolicyVersion, 'string');
  assert.equal(typeof m.feePolicyVersion, 'string');
  assert.equal(typeof m.taxSource, 'string');
});

test('buildPricingMeta with sender includes fee and tax resolution labels', () => {
  const m = buildPricingMeta({
    senderCountryCode: 'US',
    billingJurisdiction: { postalCode: '94102', stateOrRegion: 'CA' },
  });
  assert.equal(m.taxResolutionMode, 'fallback_env');
  assert.equal(m.jurisdictionAppliedToTax, false);
  assert.equal(typeof m.feeResolutionSource, 'string');
  assert.equal(m.billingJurisdiction.postalCode, '94102');
});

/**
 * When wholesale (amount-only provider bps) is very low, margin search used to return
 * fee=0. PHASE1_MIN_ZORA_SERVICE_FEE_BPS (default 100) floors the line-item fee.
 */
test('min Zora service fee floor: low wholesale bps no longer yields zero line fee', () => {
  const q = resolveAmountOnlyAirtimeQuote(200, 1000);
  const r = computeCheckoutPrice({
    providerCostCents: q.providerCostCents,
    riskBufferPercent: 1.25,
    targetRetailUsdCents: 200,
    governmentTaxBps: 0,
  });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.ok(
      r.pricing.customerZoraServiceFeeCents > 0,
      'Zora line fee should be > 0 when min fee bps is active',
    );
    assert.equal(
      r.pricing.finalPriceCents,
      200 +
        r.pricing.customerGovernmentTaxCents +
        r.pricing.customerZoraServiceFeeCents,
    );
  }
});

test('pricingBreakdownFromSnapshot ignores Stage 1 policy keys on snapshot', () => {
  const snap = {
    orchestratorVersion: 1,
    taxPolicyVersion: 'phase1_sender_country_bps_v1',
    feePolicyVersion: 'phase1_margin_search_min_zora_fee_v1',
    taxSource: 'env:PHASE1_GOVERNMENT_SALES_TAX_BPS_BY_SENDER',
    snapshotSchemaVersion: 1,
    customerProductValueUsdCents: 500,
    customerGovernmentTaxUsdCents: 41,
    customerZoraServiceFeeUsdCents: 0,
    finalPriceUsdCents: 541,
  };
  const row = pricingBreakdownFromSnapshot(snap, 541);
  assert.equal(row.totalUsdCents, 541);
  assert.equal(row.productValueUsdCents, 500);
});
