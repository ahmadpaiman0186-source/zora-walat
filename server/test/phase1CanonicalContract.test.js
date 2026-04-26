import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ORDER_STATUS } from '../src/constants/orderStatus.js';
import { FINANCIAL_ANOMALY } from '../src/constants/financialAnomaly.js';
import { collectFinancialAnomalyCodes } from '../src/services/financialTruthService.js';
import { toCanonicalPhase1OrderDto } from '../src/services/canonicalPhase1OrderService.js';
import { PHASE1_CANONICAL_PHASE } from '../src/services/canonicalPhase1Lifecycle.js';
import { POST_PAYMENT_INCIDENT_STATUS } from '../src/constants/postPaymentIncidentStatus.js';
import { POST_PAYMENT_INCIDENT_MAP_SOURCE } from '../src/constants/postPaymentIncidentMapSource.js';
import { RECONCILIATION_STATUS } from '../src/constants/reconciliationStatus.js';

/**
 * Fixture rows → assert canonical DTO is the support contract (no DB).
 */
function row(overrides) {
  const now = new Date('2026-04-01T12:00:00.000Z');
  return {
    id: 'ck_fixture',
    idempotencyKey: 'idem_fixture',
    senderCountryCode: 'US',
    recipientNational: '701234567',
    operatorKey: 'mtn',
    productType: 'mobile_topup',
    packageId: 'mock_mtn_10',
    currency: 'usd',
    metadata: null,
    pricingSnapshot: null,
    fulfillmentTruthSnapshot: null,
    amountUsdCents: 1000,
    fxBufferUsdCents: 0,
    riskBufferUsdCents: 0,
    status: 'PAYMENT_SUCCEEDED',
    orderStatus: ORDER_STATUS.PAID,
    stripePaymentIntentId: 'pi_fixture',
    stripeCheckoutSessionId: 'cs_fixture',
    stripeCustomerId: 'cus_fixture',
    completedByWebhookEventId: 'evt_fixture',
    stripeFeeEstimateUsdCents: 59,
    stripeFeeActualUsdCents: 58,
    stripeBalanceTransactionAmountCents: 1000,
    providerCostUsdCents: 800,
    providerCostActualUsdCents: 795,
    providerCostTruthSource: 'provider_api',
    projectedNetMarginBp: 100,
    actualNetMarginBp: 120,
    refinedActualNetMarginBp: 118,
    financialAnomalyCodes: [],
    fulfillmentProviderReference: 'ref_prov',
    fulfillmentProviderKey: 'reloadly',
    financialTruthComputedAt: now,
    paidAt: now,
    failedAt: null,
    cancelledAt: null,
    failureReason: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('Phase 1 canonical DTO contract (fixtures)', () => {
  it('successful mobile top-up: delivered + canonical phase + no stuck signals', () => {
    const checkout = row({
      orderStatus: ORDER_STATUS.FULFILLED,
      status: 'RECHARGE_COMPLETED',
      financialAnomalyCodes: [],
    });
    const dto = toCanonicalPhase1OrderDto(
      checkout,
      {
        status: 'SUCCEEDED',
        provider: 'reloadly',
        providerReference: 'ref_prov',
        attemptNumber: 1,
        startedAt: new Date('2026-04-01T12:00:01.000Z'),
      },
      { attemptCount: 1 },
    );
    assert.equal(dto.canonicalPhase, PHASE1_CANONICAL_PHASE.DELIVERED);
    assert.equal(dto.lifecycleStatus, ORDER_STATUS.FULFILLED);
    assert.equal(dto.lifecycleSummary.headline, 'Delivered');
    assert.equal(dto.stripePaymentIntentId, 'pi_fixture');
    assert.equal(dto.completedByStripeWebhookEventId, 'evt_fixture');
    assert.equal(dto.postPaymentIncident.status, POST_PAYMENT_INCIDENT_STATUS.NONE);
    assert.equal(dto.postPaymentIncident.recordedInApp, false);
    assert.ok(Array.isArray(dto.financialAnomalySupportLines));
    assert.equal(dto.financialAnomalySupportLines.length, 0);
    assert.ok(typeof dto.processingTimeoutMsApplied === 'number' && dto.processingTimeoutMsApplied > 0);
    assert.ok(dto.supportCorrelationChecklist?.apiOwnerPhase1Truth?.includes('ck_fixture'));
    assert.equal(dto.supportCorrelationChecklist?.paymentCompletionTruth?.schemaVersion, 1);
    assert.equal(dto.supportCorrelationChecklist?.fulfillmentExecutionTruth?.schemaVersion, 1);
    assert.equal(dto.supportCorrelationChecklist?.stripeObjects?.paymentIntentId, 'pi_fixture');
    assert.equal(dto.reconciliationStatus, RECONCILIATION_STATUS.MATCH);
    assert.ok(typeof dto.expectedMarginUsd === 'number');
    assert.ok(typeof dto.actualMarginUsd === 'number');
    assert.ok(dto.marginDeltaUsd != null);
    assert.equal(dto.fulfillmentPaymentGate?.workerMayClaimPaidQueued, false);
    assert.equal(dto.fulfillmentPaymentGate?.clientKickMayInvoke, false);
    assert.deepEqual(dto.lifecycleCoherenceViolations ?? [], []);
  });

  it('post-payment incident persisted on dispute surfaces on canonical DTO', () => {
    const checkout = row({
      postPaymentIncidentStatus: POST_PAYMENT_INCIDENT_STATUS.DISPUTED,
      postPaymentIncidentNotes: 'Manual: dispute opened',
      postPaymentIncidentUpdatedAt: new Date('2026-04-02T00:00:00.000Z'),
    });
    const dto = toCanonicalPhase1OrderDto(checkout, null, { attemptCount: 0 });
    assert.equal(dto.postPaymentIncident.status, POST_PAYMENT_INCIDENT_STATUS.DISPUTED);
    assert.equal(dto.postPaymentIncident.recordedInApp, true);
    assert.ok(dto.postPaymentIncident.updatedAt);
    assert.equal(dto.postPaymentIncident.mapSource, null);
    assert.equal(dto.postPaymentIncident.disputeSupportMapping, 'partial_or_unaudited_map');
    assert.equal(dto.postPaymentIncident.incidentMappingAuditComplete, false);
  });

  it('post-payment dispute with mapSource from Stripe payload is audit-complete', () => {
    const checkout = row({
      postPaymentIncidentStatus: POST_PAYMENT_INCIDENT_STATUS.DISPUTED,
      postPaymentIncidentMapSource: POST_PAYMENT_INCIDENT_MAP_SOURCE.DISPUTE_PAYLOAD_PI,
      postPaymentIncidentUpdatedAt: new Date('2026-04-02T00:00:00.000Z'),
    });
    const dto = toCanonicalPhase1OrderDto(checkout, null, { attemptCount: 0 });
    assert.equal(dto.postPaymentIncident.disputeSupportMapping, 'direct_from_stripe_dispute_payload');
    assert.equal(dto.postPaymentIncident.incidentMappingAuditComplete, true);
  });

  it('amount mismatch: anomaly on row surfaces in canonical DTO', () => {
    const checkout = row({
      orderStatus: ORDER_STATUS.FULFILLED,
      status: 'RECHARGE_COMPLETED',
      stripeBalanceTransactionAmountCents: 999,
      amountUsdCents: 1000,
    });
    const codes = collectFinancialAnomalyCodes(checkout);
    assert.ok(codes.includes(FINANCIAL_ANOMALY.STRIPE_AMOUNT_MISMATCH));
    const withCodes = { ...checkout, financialAnomalyCodes: codes };
    const dto = toCanonicalPhase1OrderDto(withCodes, null, { attemptCount: 0 });
    assert.ok(dto.financialAnomalyCodes.includes(FINANCIAL_ANOMALY.STRIPE_AMOUNT_MISMATCH));
    assert.ok(dto.lifecycleSummary.detail.includes('STRIPE_AMOUNT_MISMATCH'));
    assert.ok(
      dto.financialAnomalySupportLines.some((line) => line.includes('STRIPE_AMOUNT_MISMATCH')),
    );
  });

  it('provider cost unavailable: Reloadly delivered + null actual cost', () => {
    const checkout = row({
      orderStatus: ORDER_STATUS.FULFILLED,
      providerCostActualUsdCents: null,
      providerCostTruthSource: 'unverified',
      fulfillmentProviderKey: 'reloadly',
      fulfillmentProviderReference: 'ok',
    });
    const codes = collectFinancialAnomalyCodes(checkout);
    assert.ok(codes.includes(FINANCIAL_ANOMALY.PROVIDER_COST_UNVERIFIED));
    const dto = toCanonicalPhase1OrderDto(
      { ...checkout, financialAnomalyCodes: codes },
      { status: 'SUCCEEDED', provider: 'reloadly', providerReference: 'ok', attemptNumber: 1, startedAt: new Date() },
      { attemptCount: 1 },
    );
    assert.equal(dto.providerCostActualUsdCents, null);
    assert.equal(dto.providerCostTruthSource, 'unverified');
  });

  it('provider reference missing on delivered row', () => {
    const checkout = row({
      orderStatus: ORDER_STATUS.FULFILLED,
      fulfillmentProviderReference: null,
      fulfillmentProviderKey: 'reloadly',
    });
    const codes = collectFinancialAnomalyCodes(checkout);
    assert.ok(codes.includes(FINANCIAL_ANOMALY.PROVIDER_REFERENCE_MISSING));
    const dto = toCanonicalPhase1OrderDto(
      { ...checkout, financialAnomalyCodes: codes },
      null,
      { attemptCount: 1 },
    );
    assert.ok(dto.financialAnomalyCodes.includes(FINANCIAL_ANOMALY.PROVIDER_REFERENCE_MISSING));
  });

  it('negative margin anomaly surfaces in lifecycle detail', () => {
    const checkout = row({
      orderStatus: ORDER_STATUS.FULFILLED,
      amountUsdCents: 1000,
      providerCostUsdCents: 950,
      stripeFeeActualUsdCents: 100,
      fxBufferUsdCents: 0,
      riskBufferUsdCents: 0,
      providerCostActualUsdCents: null,
    });
    const codes = collectFinancialAnomalyCodes(checkout);
    assert.ok(codes.includes(FINANCIAL_ANOMALY.NEGATIVE_MARGIN));
    const dto = toCanonicalPhase1OrderDto(
      { ...checkout, financialAnomalyCodes: codes },
      null,
      { attemptCount: 0 },
    );
    assert.ok(dto.lifecycleSummary.detail.includes('NEGATIVE_MARGIN'));
  });
});
