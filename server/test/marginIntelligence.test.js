import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  estimateStripeFeeUsdCents,
  computeNetMarginUsdCents,
  marginPercentBpFromNet,
  buildMarginSnapshotForDeliveredOrder,
  extractProviderCostUsdCentsFromResponse,
  estimateProviderCostFromFaceBps,
  inferProductType,
  inferDestinationCountry,
} from '../src/lib/marginIntelligence.js';
import { aggregateMarginSummaryFromRows } from '../src/services/marginAnalyticsService.js';

describe('marginIntelligence', () => {
  it('estimateStripeFeeUsdCents uses bps + fixed', () => {
    assert.equal(
      estimateStripeFeeUsdCents(10000, { feeBps: 290, fixedCents: 30 }),
      290 + 30,
    );
    assert.equal(
      estimateStripeFeeUsdCents(99, { feeBps: 290, fixedCents: 30 }),
      Math.ceil((99 * 290) / 10000) + 30,
    );
  });

  it('computeNetMarginUsdCents matches formula', () => {
    assert.equal(
      computeNetMarginUsdCents({
        sellUsdCents: 1000,
        providerCostUsdCents: 700,
        paymentFeeUsdCents: 59,
      }),
      241,
    );
  });

  it('marginPercentBpFromNet is net/sell in basis points', () => {
    assert.equal(marginPercentBpFromNet(250, 1000), 2500);
    assert.equal(marginPercentBpFromNet(-50, 1000), -500);
    assert.equal(marginPercentBpFromNet(0, 0), null);
  });

  it('extractProviderCostUsdCentsFromResponse reads whitelisted keys', () => {
    assert.equal(
      extractProviderCostUsdCentsFromResponse({ wholesaleAmount: 4.2 }),
      420,
    );
    assert.equal(
      extractProviderCostUsdCentsFromResponse({ cost: '10.00' }),
      1000,
    );
    assert.equal(extractProviderCostUsdCentsFromResponse({ foo: 1 }), null);
  });

  it('estimateProviderCostFromFaceBps is deterministic', () => {
    assert.equal(estimateProviderCostFromFaceBps(1000, 9000), 900);
  });

  it('buildMarginSnapshotForDeliveredOrder uses API cost when present', () => {
    const order = {
      amountUsdCents: 1000,
      currency: 'usd',
    };
    const snap = buildMarginSnapshotForDeliveredOrder(
      order,
      {
        responseSummary: { cost: 6.5 },
      },
      {
        pricingStripeFeeBps: 290,
        pricingStripeFixedCents: 30,
        pricingAmountOnlyProviderBps: 9000,
      },
    );
    assert.equal(snap.marginSellUsdCents, 1000);
    assert.equal(snap.marginProviderCostUsdCents, 650);
    assert.equal(snap.marginProviderCostSource, 'provider_api');
    const fee = estimateStripeFeeUsdCents(1000, {
      feeBps: 290,
      fixedCents: 30,
    });
    assert.equal(snap.marginPaymentFeeUsdCents, fee);
    assert.equal(snap.marginNetUsdCents, 1000 - 650 - fee);
  });

  it('buildMarginSnapshotForDeliveredOrder falls back to face bps when no API cost', () => {
    const order = { amountUsdCents: 2000, currency: 'usd' };
    const snap = buildMarginSnapshotForDeliveredOrder(
      order,
      { responseSummary: {} },
      {
        pricingStripeFeeBps: 290,
        pricingStripeFixedCents: 30,
        pricingAmountOnlyProviderBps: 8000,
      },
    );
    assert.equal(snap.marginProviderCostSource, 'estimated_face_bps');
    assert.equal(snap.marginProviderCostUsdCents, 1600);
  });

  it('inferProductType and inferDestinationCountry', () => {
    assert.equal(inferProductType('roshan_d250'), 'data');
    assert.equal(inferProductType(null), 'unknown');
    assert.equal(inferProductType('pkg_air'), 'airtime');
    assert.equal(inferDestinationCountry('roshan'), 'AF');
    assert.equal(inferDestinationCountry('unknown_op'), 'unknown');
  });

  it('aggregateMarginSummaryFromRows shape', () => {
    const agg = aggregateMarginSummaryFromRows([
      {
        marginSellUsdCents: 1000,
        marginProviderCostUsdCents: 700,
        marginPaymentFeeUsdCents: 50,
        marginNetUsdCents: 250,
      },
      {
        marginSellUsdCents: 2000,
        marginProviderCostUsdCents: 1500,
        marginPaymentFeeUsdCents: 88,
        marginNetUsdCents: 412,
      },
    ]);
    assert.equal(agg.orderCount, 2);
    assert.equal(agg.totals.sellUsd, 30);
    assert.equal(agg.totals.netMarginUsd, 6.62);
    assert.ok(typeof agg.blendedNetMarginPercentOfSell === 'number');
  });

  it('negative margin snapshot', () => {
    const order = { amountUsdCents: 500, currency: 'usd' };
    const snap = buildMarginSnapshotForDeliveredOrder(
      order,
      {
        responseSummary: { cost: 8 },
      },
      {
        pricingStripeFeeBps: 290,
        pricingStripeFixedCents: 30,
        pricingAmountOnlyProviderBps: 9000,
      },
    );
    assert.ok(snap.marginNetUsdCents < 0);
  });

  it('buildMarginSnapshotForDeliveredOrder is deterministic (idempotent inputs)', () => {
    const order = { amountUsdCents: 1500, currency: 'usd' };
    const prov = { responseSummary: { wholesaleAmount: 11.25 } };
    const cfg = {
      pricingStripeFeeBps: 290,
      pricingStripeFixedCents: 30,
      pricingAmountOnlyProviderBps: 9000,
    };
    const a = buildMarginSnapshotForDeliveredOrder(order, prov, cfg);
    const b = buildMarginSnapshotForDeliveredOrder(order, prov, cfg);
    assert.deepEqual(a, b);
  });
});
