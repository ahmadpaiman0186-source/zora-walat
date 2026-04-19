import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { WEBTOPUP_RECON_CATEGORY } from '../src/constants/webtopupReconciliationCategories.js';
import { PAYMENT_STATUS } from '../src/domain/topupOrder/statuses.js';
import { FULFILLMENT_STATUS } from '../src/domain/topupOrder/statuses.js';
import { classifyWebTopupMoneyPath } from '../src/services/topupOrder/webtopupMoneyPathReconciliationEngine.js';

const thr = {
  paidStuckMs: 3_600_000,
  queuedStuckMs: 900_000,
  processingStuckMs: 1_800_000,
};

function row(partial) {
  return {
    id: 'tw_ord_aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    paymentStatus: PAYMENT_STATUS.PENDING,
    fulfillmentStatus: FULFILLMENT_STATUS.PENDING,
    amountCents: 500,
    currency: 'usd',
    paymentIntentId: null,
    fulfillmentReference: null,
    fulfillmentAttemptCount: 0,
    fulfillmentRequestedAt: null,
    fulfillmentFailedAt: null,
    fulfillmentProvider: null,
    updatedAt: new Date('2026-04-17T12:00:00Z'),
    createdAt: new Date('2026-04-17T11:00:00Z'),
    completedByStripeEventId: null,
    ...partial,
  };
}

describe('classifyWebTopupMoneyPath', () => {
  const now = new Date('2026-04-17T14:00:00Z');

  it('consistent_paid_and_delivered when paid, delivered, and provider ref', () => {
    const r = classifyWebTopupMoneyPath(
      row({
        paymentStatus: PAYMENT_STATUS.PAID,
        fulfillmentStatus: FULFILLMENT_STATUS.DELIVERED,
        fulfillmentReference: 'mock_ref_1',
        fulfillmentProvider: 'mock',
      }),
      { issues: [], stripeLookupAttempted: false },
      { now, thresholds: thr },
    );
    assert.equal(r.category, WEBTOPUP_RECON_CATEGORY.CONSISTENT_PAID_AND_DELIVERED);
    assert.equal(r.severity, 'info');
  });

  it('paid_but_not_fulfilled when paid and fulfillment still in progress', () => {
    const r = classifyWebTopupMoneyPath(
      row({
        paymentStatus: PAYMENT_STATUS.PAID,
        fulfillmentStatus: FULFILLMENT_STATUS.QUEUED,
        fulfillmentRequestedAt: new Date('2026-04-17T13:50:00Z'),
      }),
      { issues: [], stripeLookupAttempted: false },
      { now, thresholds: thr },
    );
    assert.equal(r.category, WEBTOPUP_RECON_CATEGORY.PAID_BUT_NOT_FULFILLED);
  });

  it('paid_but_provider_reference_missing when delivered without ref', () => {
    const r = classifyWebTopupMoneyPath(
      row({
        paymentStatus: PAYMENT_STATUS.PAID,
        fulfillmentStatus: FULFILLMENT_STATUS.DELIVERED,
        fulfillmentReference: null,
      }),
      { issues: [], stripeLookupAttempted: false },
      { now, thresholds: thr },
    );
    assert.equal(r.category, WEBTOPUP_RECON_CATEGORY.PAID_BUT_PROVIDER_REFERENCE_MISSING);
  });

  it('fulfillment_failed_after_payment', () => {
    const r = classifyWebTopupMoneyPath(
      row({
        paymentStatus: PAYMENT_STATUS.PAID,
        fulfillmentStatus: FULFILLMENT_STATUS.FAILED,
        fulfillmentErrorCode: 'terminal',
      }),
      { issues: [], stripeLookupAttempted: false },
      { now, thresholds: thr },
    );
    assert.equal(r.category, WEBTOPUP_RECON_CATEGORY.FULFILLMENT_FAILED_AFTER_PAYMENT);
  });

  it('fulfillment_failed_after_payment includes financialGuardrail metadata for guardrail codes', () => {
    const r = classifyWebTopupMoneyPath(
      row({
        paymentStatus: PAYMENT_STATUS.PAID,
        fulfillmentStatus: FULFILLMENT_STATUS.FAILED,
        fulfillmentErrorCode: 'invalid_amount',
      }),
      { issues: [], stripeLookupAttempted: false },
      { now, thresholds: thr },
    );
    assert.equal(r.category, WEBTOPUP_RECON_CATEGORY.FULFILLMENT_FAILED_AFTER_PAYMENT);
    assert.ok(r.financialGuardrail);
    assert.equal(r.financialGuardrail.code, 'invalid_amount');
    assert.equal(typeof r.financialGuardrail.repairable, 'boolean');
  });

  it('stale_pending_after_payment when paid + fulfillment pending and row is old', () => {
    const r = classifyWebTopupMoneyPath(
      row({
        paymentStatus: PAYMENT_STATUS.PAID,
        fulfillmentStatus: FULFILLMENT_STATUS.PENDING,
        updatedAt: new Date('2026-04-17T08:00:00Z'),
      }),
      { issues: [], stripeLookupAttempted: false },
      { now, thresholds: thr },
    );
    assert.equal(r.category, WEBTOPUP_RECON_CATEGORY.STALE_PENDING_AFTER_PAYMENT);
  });

  it('stale_processing when queued too long', () => {
    const r = classifyWebTopupMoneyPath(
      row({
        paymentStatus: PAYMENT_STATUS.PAID,
        fulfillmentStatus: FULFILLMENT_STATUS.QUEUED,
        fulfillmentRequestedAt: new Date('2026-04-17T10:00:00Z'),
      }),
      { issues: [], stripeLookupAttempted: false },
      { now, thresholds: thr },
    );
    assert.equal(r.category, WEBTOPUP_RECON_CATEGORY.STALE_PROCESSING);
  });

  it('amount_or_currency_mismatch when Stripe compare issues are money-shaped', () => {
    const r = classifyWebTopupMoneyPath(
      row({
        paymentStatus: PAYMENT_STATUS.PAID,
        fulfillmentStatus: FULFILLMENT_STATUS.DELIVERED,
        fulfillmentReference: 'x',
      }),
      {
        issues: ['amount_mismatch'],
        stripeLookupAttempted: true,
      },
      { now, thresholds: thr },
    );
    assert.equal(r.category, WEBTOPUP_RECON_CATEGORY.AMOUNT_OR_CURRENCY_MISMATCH);
  });

  it('webhook_payment_mismatch for lifecycle PI drift', () => {
    const r = classifyWebTopupMoneyPath(
      row({
        paymentStatus: PAYMENT_STATUS.PENDING,
        fulfillmentStatus: FULFILLMENT_STATUS.PENDING,
      }),
      {
        issues: ['order_pending_but_pi_succeeded'],
        stripeLookupAttempted: true,
      },
      { now, thresholds: thr },
    );
    assert.equal(r.category, WEBTOPUP_RECON_CATEGORY.WEBHOOK_PAYMENT_MISMATCH);
  });

  it('duplicate_or_contradictory_terminal_state for pending payment + delivered', () => {
    const r = classifyWebTopupMoneyPath(
      row({
        paymentStatus: PAYMENT_STATUS.PENDING,
        fulfillmentStatus: FULFILLMENT_STATUS.DELIVERED,
        fulfillmentReference: 'weird',
      }),
      { issues: [], stripeLookupAttempted: false },
      { now, thresholds: thr },
    );
    assert.equal(r.category, WEBTOPUP_RECON_CATEGORY.DUPLICATE_OR_CONTRADICTORY_TERMINAL_STATE);
  });

  it('fulfilled_but_payment_not_confirmed when provider touched order before pay', () => {
    const r = classifyWebTopupMoneyPath(
      row({
        paymentStatus: PAYMENT_STATUS.PENDING,
        fulfillmentStatus: FULFILLMENT_STATUS.PENDING,
        fulfillmentAttemptCount: 1,
        fulfillmentProvider: 'mock',
      }),
      { issues: [], stripeLookupAttempted: false },
      { now, thresholds: thr },
    );
    assert.equal(r.category, WEBTOPUP_RECON_CATEGORY.FULFILLED_BUT_PAYMENT_NOT_CONFIRMED);
  });
});
