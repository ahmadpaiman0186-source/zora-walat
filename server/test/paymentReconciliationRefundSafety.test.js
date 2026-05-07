/**
 * Phase 1 reconciliation + refund safety (pure policy; no Stripe HTTP).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PAYMENT_CHECKOUT_STATUS } from '../src/constants/paymentCheckoutStatus.js';
import { POST_PAYMENT_INCIDENT_STATUS } from '../src/constants/postPaymentIncidentStatus.js';
import { ORDER_STATUS } from '../src/constants/orderStatus.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../src/constants/fulfillmentAttemptStatus.js';
import {
  assessPhase1RefundOperatorChecklist,
  failedFulfillmentImpliesManualReviewNotAutoRefund,
  PHASE1_AUTOMATIC_STRIPE_REFUND_FORBIDDEN,
} from '../src/domain/reconciliation/paymentReconciliationRefundSafety.js';
import {
  classifyPaidIdle,
  evaluateCheckoutAttemptInconsistency,
  RECON_RECOMMENDATION,
  RECON_DIVERGENCE_CODE,
} from '../src/services/phase1MoneyFulfillmentReconciliationEngine.js';
import { buildPhase1ReconciliationHints } from '../src/lib/phase1ReconciliationHints.js';

describe('payment reconciliation + refund safety', () => {
  it('forbids automatic Stripe refund at policy layer', () => {
    assert.equal(PHASE1_AUTOMATIC_STRIPE_REFUND_FORBIDDEN, true);
  });

  it('refund operator checklist denies before payment row shows Stripe settlement', () => {
    const pending = assessPhase1RefundOperatorChecklist({
      status: PAYMENT_CHECKOUT_STATUS.INITIATED,
      postPaymentIncidentStatus: POST_PAYMENT_INCIDENT_STATUS.NONE,
    });
    assert.equal(pending.mayRequestManualStripeRefundReview, false);
    assert.ok(pending.denials.includes('stripe_settlement_not_confirmed_on_payment_row'));
    assert.equal(pending.automaticRefundWouldRun, false);
  });

  it('refund operator checklist allows manual review only after settlement + not already refunded', () => {
    const ok = assessPhase1RefundOperatorChecklist({
      status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
      postPaymentIncidentStatus: POST_PAYMENT_INCIDENT_STATUS.NONE,
    });
    assert.equal(ok.mayRequestManualStripeRefundReview, true);
    assert.equal(ok.denials.length, 0);
    assert.equal(ok.automaticRefundWouldRun, false);
  });

  it('refund checklist denies when refund incident already recorded', () => {
    const r = assessPhase1RefundOperatorChecklist({
      status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
      postPaymentIncidentStatus: POST_PAYMENT_INCIDENT_STATUS.REFUNDED,
    });
    assert.equal(r.mayRequestManualStripeRefundReview, false);
    assert.ok(r.denials.includes('already_recorded_refunded_incident'));
  });

  it('classifyPaidIdle flags PAID with no attempts as PAID_NO_ATTEMPT (retry candidate, not refund)', () => {
    const row = {
      id: 'ord_x',
      orderStatus: ORDER_STATUS.PAID,
      status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
      paidAt: new Date(),
      fulfillmentAttempts: [],
    };
    const r = classifyPaidIdle(row, []);
    assert.equal(r.code, RECON_DIVERGENCE_CODE.PAID_NO_ATTEMPT);
    assert.equal(r.recommendation, RECON_RECOMMENDATION.SAFE_QUEUE_RETRY_CANDIDATE);
  });

  it('classifyPaidIdle uses MANUAL_REVIEW when latest attempt FAILED after paid', () => {
    const attempts = [
      {
        attemptNumber: 1,
        status: FULFILLMENT_ATTEMPT_STATUS.FAILED,
        id: 'a1',
      },
    ];
    const row = {
      id: 'ord_x',
      orderStatus: ORDER_STATUS.PAID,
      status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
      paidAt: new Date(),
      fulfillmentAttempts: attempts,
    };
    const r = classifyPaidIdle(row, attempts);
    assert.equal(r.code, RECON_DIVERGENCE_CODE.PROCESSING_LAST_ATTEMPT_FAILED);
    assert.equal(r.recommendation, RECON_RECOMMENDATION.MANUAL_REVIEW);
    assert.equal(
      failedFulfillmentImpliesManualReviewNotAutoRefund({ recommendation: r.recommendation }),
      true,
    );
  });

  it('duplicate logical fulfillment risk: multiple SUCCEEDED attempts flagged', () => {
    const inc = evaluateCheckoutAttemptInconsistency(
      ORDER_STATUS.FULFILLED,
      { status: FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED },
      2,
    );
    assert.ok(inc);
    assert.equal(inc.inconsistencyKind, 'multiple_succeeded_attempts');
  });

  it('reconciliation hints surface orphan paid-without-attempt risk token', () => {
    const hints = buildPhase1ReconciliationHints(
      {
        id: 'o1',
        status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
        orderStatus: ORDER_STATUS.PAID,
        paidAt: new Date(),
        metadata: null,
        stripePaymentIntentId: 'pi_x',
        completedByWebhookEventId: 'evt_x',
        fulfillmentProviderReference: null,
        fulfillmentProviderKey: null,
      },
      [],
    );
    assert.ok(hints.divergenceRisks.includes('paid_without_any_fulfillment_attempt'));
  });
});
