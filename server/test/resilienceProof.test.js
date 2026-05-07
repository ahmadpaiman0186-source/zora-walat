/**
 * Resilience / reconciliation proofs (pure logic + optional DB).
 * Ledger duplicate webhook idempotency: see `ledgerService.test.js` ("same idempotency key does not duplicate").
 * Concurrent fulfillment: see `test/integrations/transactionFortressConcurrency.integration.test.js`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ORDER_STATUS } from '../src/constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../src/constants/paymentCheckoutStatus.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../src/constants/fulfillmentAttemptStatus.js';
import { PAYMENT_FULFILLMENT_RECON_STATUS } from '../src/constants/paymentFulfillmentReconciliationStatus.js';
import { evaluatePaymentFulfillmentReconciliationRow } from '../src/services/paymentFulfillmentReconciliationEval.js';
import { evaluateDeliveredProviderTruth } from '../src/services/providerVerificationService.js';
import { LEDGER_EVENT_TYPE } from '../src/ledger/ledgerService.js';
import { PROVIDER_TRUTH_STATUS } from '../src/constants/providerTruthStatus.js';
import {
  computePaymentCheckoutTrustScore,
  isTrustBlocked,
  isTrustSuspicious,
} from '../src/lib/paymentCheckoutTrust.js';
import { scoreFromFraudAggregates } from '../src/services/fraudDetectionService.js';

describe('paymentFulfillmentReconciliationEval', () => {
  it('PAID + evt + money but no ledger → required', () => {
    const r = evaluatePaymentFulfillmentReconciliationRow({
      orderStatus: ORDER_STATUS.PAID,
      amountUsdCents: 500,
      completedByWebhookEventId: 'evt_abc',
      fulfillmentAttempts: [
        {
          attemptNumber: 1,
          status: FULFILLMENT_ATTEMPT_STATUS.QUEUED,
          providerReference: null,
        },
      ],
      ledgerJournalEntries: [],
    });
    assert.equal(r.nextStatus, PAYMENT_FULFILLMENT_RECON_STATUS.REQUIRED);
    assert.equal(r.enqueueFulfillment, false);
    assert.ok(r.reasons.some((x) => x.includes('ledger')));
  });

  it('PAID + ledger + queued attempt → pending', () => {
    const r = evaluatePaymentFulfillmentReconciliationRow({
      orderStatus: ORDER_STATUS.PAID,
      amountUsdCents: 500,
      completedByWebhookEventId: 'evt_abc',
      fulfillmentAttempts: [
        {
          attemptNumber: 1,
          status: FULFILLMENT_ATTEMPT_STATUS.QUEUED,
          providerReference: null,
        },
      ],
      ledgerJournalEntries: [{ eventType: LEDGER_EVENT_TYPE.PAYMENT_CAPTURED }],
    });
    assert.equal(r.nextStatus, PAYMENT_FULFILLMENT_RECON_STATUS.PENDING);
  });

  it('PROCESSING + PROCESSING attempt without ref beyond threshold → required + enqueue', () => {
    const old = new Date(Date.now() - 400_000);
    const r = evaluatePaymentFulfillmentReconciliationRow(
      {
        orderStatus: ORDER_STATUS.PROCESSING,
        amountUsdCents: 500,
        completedByWebhookEventId: 'evt_abc',
        fulfillmentAttempts: [
          {
            attemptNumber: 1,
            status: FULFILLMENT_ATTEMPT_STATUS.PROCESSING,
            providerReference: null,
            startedAt: old,
          },
        ],
        ledgerJournalEntries: [{ eventType: LEDGER_EVENT_TYPE.PAYMENT_CAPTURED }],
      },
      { stuckProcessingMs: 120_000, now: new Date() },
    );
    assert.equal(r.nextStatus, PAYMENT_FULFILLMENT_RECON_STATUS.REQUIRED);
    assert.equal(r.enqueueFulfillment, true);
  });
});

describe('scoreFromFraudAggregates', () => {
  it('high velocity + repeats caps at 100', () => {
    const { score, codes } = scoreFromFraudAggregates({
      velocityUser15m: 6,
      sameCustomer24h: 4,
      fingerprint1h: 0,
      failedAttemptsOnOrder: 2,
      abnormalAmount: true,
    });
    assert.equal(score, 100);
    assert.ok(codes.length > 0);
  });
});

describe('computePaymentCheckoutTrustScore', () => {
  it('paid + recon clear → 50 (not blocked)', () => {
    const s = computePaymentCheckoutTrustScore({
      status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
      orderStatus: ORDER_STATUS.PAID,
      completedByWebhookEventId: 'evt_x',
      providerTruthStatus: PROVIDER_TRUTH_STATUS.UNKNOWN,
      reconciliationStatus: 'pending',
    });
    assert.equal(s, 50);
    assert.equal(isTrustBlocked(s), false);
    assert.equal(isTrustSuspicious(s), true);
  });

  it('fulfilled + provider ok → 100', () => {
    const s = computePaymentCheckoutTrustScore({
      status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
      orderStatus: ORDER_STATUS.FULFILLED,
      completedByWebhookEventId: 'evt_x',
      providerTruthStatus: PROVIDER_TRUTH_STATUS.OK,
      reconciliationStatus: 'ok',
    });
    assert.equal(s, 100);
  });
});

describe('evaluateDeliveredProviderTruth', () => {
  it('FULFILLED + succeeded attempt + ref + ok summary → ok', () => {
    const r = evaluateDeliveredProviderTruth({
      orderStatus: ORDER_STATUS.FULFILLED,
      fulfillmentProviderReference: 'ref_x',
      fulfillmentAttempts: [
        {
          status: FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED,
          providerReference: 'ref_x',
          responseSummary: JSON.stringify({ outcome: 'success' }),
        },
      ],
    });
    assert.equal(r.ok, true);
  });

  it('FULFILLED but missing provider ref → mismatch', () => {
    const r = evaluateDeliveredProviderTruth({
      orderStatus: ORDER_STATUS.FULFILLED,
      fulfillmentAttempts: [
        {
          status: FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED,
          providerReference: null,
          responseSummary: '{}',
        },
      ],
    });
    assert.equal(r.ok, false);
  });
});
