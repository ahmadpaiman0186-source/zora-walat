import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ORDER_STATUS } from '../src/constants/orderStatus.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../src/constants/fulfillmentAttemptStatus.js';
import { evaluateCheckoutAttemptInconsistency } from '../src/services/phase1MoneyFulfillmentReconciliationEngine.js';

describe('evaluateCheckoutAttemptInconsistency', () => {
  it('detects multiple succeeded attempts', () => {
    const r = evaluateCheckoutAttemptInconsistency(
      ORDER_STATUS.PROCESSING,
      { status: FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED },
      2,
    );
    assert.equal(r?.inconsistencyKind, 'multiple_succeeded_attempts');
  });

  it('detects FULFILLED without latest success', () => {
    const r = evaluateCheckoutAttemptInconsistency(
      ORDER_STATUS.FULFILLED,
      { status: FULFILLMENT_ATTEMPT_STATUS.FAILED },
      0,
    );
    assert.equal(r?.inconsistencyKind, 'fulfilled_without_latest_success_attempt');
  });

  it('detects terminal negative with success attempt', () => {
    const r = evaluateCheckoutAttemptInconsistency(
      ORDER_STATUS.FAILED,
      { status: FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED },
      1,
    );
    assert.equal(r?.inconsistencyKind, 'terminal_negative_with_success_attempt');
  });

  it('detects PROCESSING latest failed after prior success', () => {
    const r = evaluateCheckoutAttemptInconsistency(
      ORDER_STATUS.PROCESSING,
      { status: FULFILLMENT_ATTEMPT_STATUS.FAILED },
      1,
    );
    assert.equal(r?.inconsistencyKind, 'processing_latest_failed_after_prior_success');
  });

  it('returns null for consistent PROCESSING + latest processing + no success', () => {
    const r = evaluateCheckoutAttemptInconsistency(
      ORDER_STATUS.PROCESSING,
      { status: FULFILLMENT_ATTEMPT_STATUS.PROCESSING },
      0,
    );
    assert.equal(r, null);
  });
});
