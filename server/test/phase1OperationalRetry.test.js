import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ORDER_STATUS } from '../src/constants/orderStatus.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../src/constants/fulfillmentAttemptStatus.js';
import { POST_PAYMENT_INCIDENT_STATUS } from '../src/constants/postPaymentIncidentStatus.js';
import {
  evaluatePhase1OperationalRetrySchedule,
  shouldScheduleFollowUpFulfillmentAttempt,
  OPERATIONAL_RETRY_DENIAL,
} from '../src/domain/fulfillment/phase1OperationalRetry.js';
import { TRANSIENT_RETRY_ATTEMPT_BUDGET } from '../src/domain/fulfillment/retryPolicy.js';

function baseOrder(overrides = {}) {
  return {
    id: 'ord_1',
    orderStatus: ORDER_STATUS.FAILED,
    postPaymentIncidentStatus: POST_PAYMENT_INCIDENT_STATUS.NONE,
    ...overrides,
  };
}

describe('phase1OperationalRetry', () => {
  const transientCtx = { lastFailureTransientEligible: true };

  it('allows transient retry when FAILED, single FAILED attempt, budget headroom', () => {
    const r = evaluatePhase1OperationalRetrySchedule(
      baseOrder(),
      [{ attemptNumber: 1, status: FULFILLMENT_ATTEMPT_STATUS.FAILED }],
      transientCtx,
    );
    assert.equal(r.allowed, true);
    if (r.allowed) {
      assert.equal(r.nextAttemptNumber, 2);
    }
  });

  it('denies retry before payment captured (PENDING)', () => {
    const r = evaluatePhase1OperationalRetrySchedule(
      baseOrder({ orderStatus: ORDER_STATUS.PENDING }),
      [{ attemptNumber: 1, status: FULFILLMENT_ATTEMPT_STATUS.FAILED }],
      transientCtx,
    );
    assert.equal(r.allowed, false);
    assert.equal(r.denial, OPERATIONAL_RETRY_DENIAL.NOT_PAID);
  });

  it('denies permanent (non-transient) failure', () => {
    const r = evaluatePhase1OperationalRetrySchedule(
      baseOrder(),
      [{ attemptNumber: 1, status: FULFILLMENT_ATTEMPT_STATUS.FAILED }],
      { lastFailureTransientEligible: false },
    );
    assert.equal(r.allowed, false);
    assert.equal(r.denial, OPERATIONAL_RETRY_DENIAL.NOT_TRANSIENT);
  });

  it('denies when retry budget exceeded', () => {
    const attempts = [1, 2, 3, 4].map((n) => ({
      attemptNumber: n,
      status: FULFILLMENT_ATTEMPT_STATUS.FAILED,
    }));
    const r = evaluatePhase1OperationalRetrySchedule(baseOrder(), attempts, transientCtx);
    assert.equal(r.allowed, false);
    assert.equal(r.denial, OPERATIONAL_RETRY_DENIAL.BUDGET_EXCEEDED);
    if (!r.allowed && r.detail) {
      assert.equal(r.detail.maxAttemptNumber, 4);
      assert.equal(r.detail.transientRetryBudget, TRANSIENT_RETRY_ATTEMPT_BUDGET);
    }
  });

  it('denies duplicate work while QUEUED attempt exists', () => {
    const r = evaluatePhase1OperationalRetrySchedule(
      baseOrder({ orderStatus: ORDER_STATUS.PROCESSING }),
      [
        { attemptNumber: 1, status: FULFILLMENT_ATTEMPT_STATUS.FAILED },
        { attemptNumber: 2, status: FULFILLMENT_ATTEMPT_STATUS.QUEUED },
      ],
      transientCtx,
    );
    assert.equal(r.allowed, false);
    assert.equal(r.denial, OPERATIONAL_RETRY_DENIAL.ACTIVE_ATTEMPT_IN_FLIGHT);
  });

  it('denies when any attempt succeeded', () => {
    const r = evaluatePhase1OperationalRetrySchedule(
      baseOrder(),
      [
        { attemptNumber: 1, status: FULFILLMENT_ATTEMPT_STATUS.FAILED },
        { attemptNumber: 2, status: FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED },
      ],
      transientCtx,
    );
    assert.equal(r.allowed, false);
    assert.equal(r.denial, OPERATIONAL_RETRY_DENIAL.ALREADY_SUCCEEDED);
  });

  it('denies terminal cancelled order', () => {
    const r = evaluatePhase1OperationalRetrySchedule(
      baseOrder({ orderStatus: ORDER_STATUS.CANCELLED }),
      [{ attemptNumber: 1, status: FULFILLMENT_ATTEMPT_STATUS.FAILED }],
      transientCtx,
    );
    assert.equal(r.allowed, false);
    assert.equal(r.denial, OPERATIONAL_RETRY_DENIAL.ORDER_TERMINAL);
  });

  it('shouldScheduleFollowUpFulfillmentAttempt mirrors evaluate with partial attempts', () => {
    assert.equal(
      shouldScheduleFollowUpFulfillmentAttempt(
        baseOrder(),
        { attemptNumber: 1, status: FULFILLMENT_ATTEMPT_STATUS.FAILED },
        transientCtx,
      ),
      true,
    );
  });

  it('respects custom transient retry budget', () => {
    const attempts = [
      { attemptNumber: 1, status: FULFILLMENT_ATTEMPT_STATUS.FAILED },
      { attemptNumber: 2, status: FULFILLMENT_ATTEMPT_STATUS.FAILED },
    ];
    const r = evaluatePhase1OperationalRetrySchedule(baseOrder(), attempts, {
      ...transientCtx,
      transientRetryBudget: 1,
    });
    assert.equal(r.allowed, false);
    assert.equal(r.denial, OPERATIONAL_RETRY_DENIAL.BUDGET_EXCEEDED);
  });
});
