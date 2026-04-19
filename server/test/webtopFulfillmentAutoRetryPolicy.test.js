import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FULFILLMENT_DB_ERROR } from '../src/domain/topupOrder/fulfillmentErrors.js';
import {
  backoffMsBeforeNextAutoRetry,
  computeFulfillmentNextRetryAt,
  isPersistedFulfillmentErrorRetryable,
} from '../src/domain/topupOrder/webtopFulfillmentAutoRetryPolicy.js';

describe('webtopFulfillmentAutoRetryPolicy', () => {
  it('isPersistedFulfillmentErrorRetryable recognizes bucket + explicit codes', () => {
    assert.equal(isPersistedFulfillmentErrorRetryable(FULFILLMENT_DB_ERROR.RETRYABLE), true);
    assert.equal(isPersistedFulfillmentErrorRetryable('provider_timeout'), true);
    assert.equal(isPersistedFulfillmentErrorRetryable('FAILSIM_TIMEOUT'), true);
    assert.equal(isPersistedFulfillmentErrorRetryable(FULFILLMENT_DB_ERROR.TERMINAL), false);
    assert.equal(isPersistedFulfillmentErrorRetryable(FULFILLMENT_DB_ERROR.UNSUPPORTED_ROUTE), false);
  });

  it('backoffMsBeforeNextAutoRetry caps at max attempts', () => {
    assert.equal(typeof backoffMsBeforeNextAutoRetry(1), 'number');
    assert.ok(backoffMsBeforeNextAutoRetry(1) > 0);
    assert.equal(backoffMsBeforeNextAutoRetry(99), null);
  });

  it('computeFulfillmentNextRetryAt only for failed_retryable + retryable code', () => {
    assert.equal(
      computeFulfillmentNextRetryAt(1, 'provider_timeout', 'failed_retryable') instanceof Date,
      true,
    );
    assert.equal(
      computeFulfillmentNextRetryAt(1, FULFILLMENT_DB_ERROR.TERMINAL, 'failed_retryable'),
      null,
    );
    assert.equal(computeFulfillmentNextRetryAt(1, 'provider_timeout', 'failed_terminal'), null);
  });
});
