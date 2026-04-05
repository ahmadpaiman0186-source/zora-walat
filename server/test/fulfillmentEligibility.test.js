import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FULFILLMENT_STATUS, PAYMENT_STATUS } from '../src/domain/topupOrder/statuses.js';
import { FULFILLMENT_DB_ERROR } from '../src/domain/topupOrder/fulfillmentErrors.js';
import {
  assertEligibleForInitialDispatch,
  assertEligibleForRetryDispatch,
  isFulfillmentDispatchBlocked,
} from '../src/services/topupFulfillment/fulfillmentEligibility.js';

describe('fulfillmentEligibility', () => {
  it('initial dispatch requires paid + pending', () => {
    assert.equal(
      assertEligibleForInitialDispatch({
        paymentStatus: PAYMENT_STATUS.PAID,
        fulfillmentStatus: FULFILLMENT_STATUS.PENDING,
      }).ok,
      true,
    );
    assert.equal(
      assertEligibleForInitialDispatch({
        paymentStatus: PAYMENT_STATUS.PENDING,
        fulfillmentStatus: FULFILLMENT_STATUS.PENDING,
      }).ok,
      false,
    );
    assert.equal(
      assertEligibleForInitialDispatch({
        paymentStatus: PAYMENT_STATUS.PAID,
        fulfillmentStatus: FULFILLMENT_STATUS.DELIVERED,
      }).ok,
      false,
    );
  });

  it('retry allows failed+retryable or retrying', () => {
    assert.equal(
      assertEligibleForRetryDispatch({
        paymentStatus: PAYMENT_STATUS.PAID,
        fulfillmentStatus: FULFILLMENT_STATUS.FAILED,
        fulfillmentErrorCode: FULFILLMENT_DB_ERROR.RETRYABLE,
      }).ok,
      true,
    );
    assert.equal(
      assertEligibleForRetryDispatch({
        paymentStatus: PAYMENT_STATUS.PAID,
        fulfillmentStatus: FULFILLMENT_STATUS.RETRYING,
      }).ok,
      true,
    );
    assert.equal(
      assertEligibleForRetryDispatch({
        paymentStatus: PAYMENT_STATUS.PAID,
        fulfillmentStatus: FULFILLMENT_STATUS.FAILED,
        fulfillmentErrorCode: FULFILLMENT_DB_ERROR.TERMINAL,
      }).ok,
      false,
    );
  });

  it('blocks duplicate dispatch when queued/processing/delivered', () => {
    assert.equal(isFulfillmentDispatchBlocked(FULFILLMENT_STATUS.QUEUED), true);
    assert.equal(isFulfillmentDispatchBlocked(FULFILLMENT_STATUS.PROCESSING), true);
    assert.equal(isFulfillmentDispatchBlocked(FULFILLMENT_STATUS.DELIVERED), true);
    assert.equal(isFulfillmentDispatchBlocked(FULFILLMENT_STATUS.PENDING), false);
  });

  it('duplicate dispatch prevented: paid+queued is not initial-eligible', () => {
    const r = assertEligibleForInitialDispatch({
      paymentStatus: PAYMENT_STATUS.PAID,
      fulfillmentStatus: FULFILLMENT_STATUS.QUEUED,
    });
    assert.equal(r.ok, false);
  });
});
