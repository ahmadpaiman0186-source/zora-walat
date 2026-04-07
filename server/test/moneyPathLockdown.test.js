import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { evaluateProductionMoneyPathSafety } from '../src/config/productionSafetyGates.js';
import { collectFinancialAnomalyCodes } from '../src/services/financialTruthService.js';
import { FINANCIAL_ANOMALY } from '../src/constants/financialAnomaly.js';
import { ORDER_STATUS } from '../src/constants/orderStatus.js';
import {
  toCanonicalPhase1OrderDto,
} from '../src/services/canonicalPhase1OrderService.js';
import { POST_PAYMENT_INCIDENT_STATUS } from '../src/constants/postPaymentIncidentStatus.js';
import {
  isStripeFeeAlreadyCaptured,
  parseUsdBalanceTransaction,
  computeActualNetMarginBp,
} from '../src/services/paymentCheckoutStripeFeeService.js';

function baseCheckout(overrides = {}) {
  const now = new Date('2026-04-01T12:00:00.000Z');
  return {
    id: 'ck_test_1',
    idempotencyKey: 'idem_test_1',
    senderCountryCode: 'US',
    recipientNational: '701234567',
    operatorKey: 'mtn',
    productType: 'mobile_topup',
    packageId: null,
    currency: 'usd',
    metadata: null,
    pricingSnapshot: null,
    fulfillmentTruthSnapshot: null,
    amountUsdCents: 1000,
    status: 'PAYMENT_SUCCEEDED',
    orderStatus: ORDER_STATUS.PAID,
    stripePaymentIntentId: 'pi_test',
    stripeCheckoutSessionId: 'cs_test',
    stripeCustomerId: null,
    completedByWebhookEventId: null,
    stripeFeeEstimateUsdCents: 59,
    stripeFeeActualUsdCents: null,
    stripeBalanceTransactionAmountCents: null,
    providerCostUsdCents: 800,
    providerCostActualUsdCents: null,
    providerCostTruthSource: null,
    projectedNetMarginBp: 100,
    actualNetMarginBp: null,
    refinedActualNetMarginBp: null,
    financialAnomalyCodes: [],
    fulfillmentProviderReference: null,
    fulfillmentProviderKey: null,
    financialTruthComputedAt: null,
    paidAt: null,
    failedAt: null,
    cancelledAt: null,
    failureReason: null,
    postPaymentIncidentStatus: null,
    postPaymentIncidentNotes: null,
    postPaymentIncidentUpdatedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('evaluateProductionMoneyPathSafety', () => {
  it('allows non-production NODE_ENV', () => {
    const r = evaluateProductionMoneyPathSafety({
      NODE_ENV: 'development',
      AIRTIME_PROVIDER: 'mock',
    });
    assert.equal(r.ok, true);
  });

  it('rejects DEV_CHECKOUT_AUTH_BYPASS in production', () => {
    const r = evaluateProductionMoneyPathSafety({
      NODE_ENV: 'production',
      DEV_CHECKOUT_AUTH_BYPASS: 'true',
    });
    assert.equal(r.ok, false);
    assert.equal(r.code, 'dev_checkout_bypass_in_production');
  });

  it('rejects mock airtime in production without explicit allow', () => {
    const r = evaluateProductionMoneyPathSafety({
      NODE_ENV: 'production',
      AIRTIME_PROVIDER: 'mock',
    });
    assert.equal(r.ok, false);
    assert.equal(r.code, 'mock_airtime_in_production');
  });

  it('allows mock airtime when explicitly flagged (and web top-up is non-mock or explicitly allowed)', () => {
    const r = evaluateProductionMoneyPathSafety({
      NODE_ENV: 'production',
      AIRTIME_PROVIDER: 'mock',
      ALLOW_MOCK_AIRTIME_IN_PRODUCTION: 'true',
      WEBTOPUP_FULFILLMENT_PROVIDER: 'reloadly',
    });
    assert.equal(r.ok, true);
  });

  it('allows full mock provider stack in production only when both ALLOW_* flags are set', () => {
    const r = evaluateProductionMoneyPathSafety({
      NODE_ENV: 'production',
      AIRTIME_PROVIDER: 'mock',
      WEBTOPUP_FULFILLMENT_PROVIDER: 'mock',
      ALLOW_MOCK_AIRTIME_IN_PRODUCTION: 'true',
      ALLOW_MOCK_WEBTOPUP_FULFILLMENT_IN_PRODUCTION: 'true',
    });
    assert.equal(r.ok, true);
  });

  it('allows reloadly airtime when web top-up provider is also non-mock', () => {
    const r = evaluateProductionMoneyPathSafety({
      NODE_ENV: 'production',
      AIRTIME_PROVIDER: 'reloadly',
      WEBTOPUP_FULFILLMENT_PROVIDER: 'reloadly',
    });
    assert.equal(r.ok, true);
  });

  it('rejects mock web top-up fulfillment in production without allow', () => {
    const r = evaluateProductionMoneyPathSafety({
      NODE_ENV: 'production',
      AIRTIME_PROVIDER: 'reloadly',
      WEBTOPUP_FULFILLMENT_PROVIDER: 'mock',
    });
    assert.equal(r.ok, false);
    assert.equal(r.code, 'mock_webtopup_fulfillment_in_production');
  });

  it('rejects Reloadly mock fallback in production', () => {
    const r = evaluateProductionMoneyPathSafety({
      NODE_ENV: 'production',
      AIRTIME_PROVIDER: 'reloadly',
      WEBTOPUP_FULFILLMENT_PROVIDER: 'reloadly',
      RELOADLY_ALLOW_UNAVAILABLE_MOCK_FALLBACK: 'true',
    });
    assert.equal(r.ok, false);
    assert.equal(r.code, 'reloadly_mock_fallback_in_production');
  });
});

describe('toCanonicalPhase1OrderDto', () => {
  it('preserves null fee actuals (no coercion to zero)', () => {
    const dto = toCanonicalPhase1OrderDto(baseCheckout(), null, { attemptCount: 0 });
    assert.equal(dto.stripeFeeActualUsdCents, null);
    assert.equal(dto.providerCostActualUsdCents, null);
    assert.equal(dto.refinedActualNetMarginBp, null);
    assert.equal(dto.fulfillmentStatus, null);
    assert.equal(dto.commercialOrderType, 'MOBILE_TOPUP');
    assert.equal(dto.checkoutChargeUsd, 10);
    assert.ok(dto.lifecycleSummary?.supportNarrative);
    assert.ok(Array.isArray(dto.stuckSignals));
    assert.equal(dto.postPaymentIncident.status, POST_PAYMENT_INCIDENT_STATUS.NONE);
    assert.equal(dto.postPaymentIncident.recordedInApp, false);
  });

  it('maps latest fulfillment attempt', () => {
    const dto = toCanonicalPhase1OrderDto(
      baseCheckout(),
      {
        status: 'SUCCEEDED',
        provider: 'reloadly',
        providerReference: 'ref-xyz',
        attemptNumber: 1,
        startedAt: null,
      },
      { attemptCount: 1 },
    );
    assert.equal(dto.fulfillmentStatus, 'SUCCEEDED');
    assert.equal(dto.latestAttemptProviderKey, 'reloadly');
    assert.equal(dto.latestAttemptProviderReference, 'ref-xyz');
  });

  it('exposes face value from pricing snapshot when present', () => {
    const dto = toCanonicalPhase1OrderDto(
      baseCheckout({
        pricingSnapshot: { faceValueUsdCents: 999 },
      }),
      null,
      { attemptCount: 0 },
    );
    assert.equal(dto.faceValueUsdKnown, true);
    assert.equal(dto.faceValueUsd, 9.99);
  });
});

describe('collectFinancialAnomalyCodes (Phase 1 money truth)', () => {
  it('STRIPE_AMOUNT_MISMATCH when balance tx amount differs from checkout', () => {
    const codes = collectFinancialAnomalyCodes(
      baseCheckout({
        stripeBalanceTransactionAmountCents: 999,
        amountUsdCents: 1000,
      }),
    );
    assert.ok(codes.includes(FINANCIAL_ANOMALY.STRIPE_AMOUNT_MISMATCH));
  });

  it('LOW_MARGIN and NEGATIVE_MARGIN when delivered and profit <= 0', () => {
    const codes = collectFinancialAnomalyCodes(
      baseCheckout({
        orderStatus: ORDER_STATUS.FULFILLED,
        amountUsdCents: 1000,
        providerCostUsdCents: 500,
        stripeFeeActualUsdCents: 400,
        fxBufferUsdCents: 50,
        riskBufferUsdCents: 100,
        providerCostActualUsdCents: null,
        stripeFeeEstimateUsdCents: null,
      }),
    );
    assert.ok(codes.includes(FINANCIAL_ANOMALY.NEGATIVE_MARGIN));
  });

  it('PROVIDER_REFERENCE_MISSING when delivered without ref', () => {
    const codes = collectFinancialAnomalyCodes(
      baseCheckout({
        orderStatus: ORDER_STATUS.FULFILLED,
        fulfillmentProviderReference: '  ',
        fulfillmentProviderKey: 'reloadly',
        amountUsdCents: 2000,
        providerCostUsdCents: 1000,
        stripeFeeActualUsdCents: 100,
        fxBufferUsdCents: 0,
        riskBufferUsdCents: 0,
        providerCostActualUsdCents: 900,
      }),
    );
    assert.ok(codes.includes(FINANCIAL_ANOMALY.PROVIDER_REFERENCE_MISSING));
  });

  it('PROVIDER_COST_UNVERIFIED for reloadly delivered without actual cost', () => {
    const codes = collectFinancialAnomalyCodes(
      baseCheckout({
        orderStatus: ORDER_STATUS.FULFILLED,
        fulfillmentProviderKey: 'reloadly',
        fulfillmentProviderReference: 'ok',
        providerCostActualUsdCents: null,
        amountUsdCents: 2000,
        providerCostUsdCents: 1000,
        stripeFeeActualUsdCents: 100,
        fxBufferUsdCents: 0,
        riskBufferUsdCents: 0,
      }),
    );
    assert.ok(codes.includes(FINANCIAL_ANOMALY.PROVIDER_COST_UNVERIFIED));
  });
});

describe('Stripe fee capture idempotency helpers', () => {
  it('isStripeFeeAlreadyCaptured is true only when actual fee is set', () => {
    assert.equal(isStripeFeeAlreadyCaptured({ stripeFeeActualUsdCents: null }), false);
    assert.equal(isStripeFeeAlreadyCaptured({ stripeFeeActualUsdCents: 42 }), true);
  });

  it('parseUsdBalanceTransaction extracts fee and amount', () => {
    const p = parseUsdBalanceTransaction(
      { fee: 33, amount: 1000, net: 967 },
      'usd',
    );
    assert.deepEqual(p, { feeCents: 33, amountCents: 1000, netCents: 967 });
  });

  it('computeActualNetMarginBp matches locked provider + actual fee path', () => {
    const bp = computeActualNetMarginBp(1000, 800, 59, 0, 0);
    assert.equal(bp, 1410);
  });
});

