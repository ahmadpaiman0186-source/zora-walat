import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FULFILLMENT_DB_ERROR } from '../src/domain/topupOrder/fulfillmentErrors.js';
import {
  fulfillmentFailureRetryable,
  isTerminalFulfillmentFailure,
  persistedFulfillmentErrorCode,
} from '../src/domain/topupOrder/webtopFulfillmentFailureSemantics.js';

describe('webtopFulfillmentFailureSemantics', () => {
  it('retryable only for failed_retryable outcome', () => {
    assert.equal(
      fulfillmentFailureRetryable({ outcome: 'failed_retryable', errorCode: 'x' }),
      true,
    );
    assert.equal(
      fulfillmentFailureRetryable({ outcome: 'failed_terminal', errorCode: 'x' }),
      false,
    );
    assert.equal(
      fulfillmentFailureRetryable({ outcome: 'invalid_request', errorCode: 'INVALID_PRODUCT' }),
      false,
    );
  });

  it('terminal fulfillment failure includes retryable + terminal + invalid + unsupported', () => {
    assert.equal(isTerminalFulfillmentFailure({ outcome: 'failed_retryable' }), true);
    assert.equal(isTerminalFulfillmentFailure({ outcome: 'failed_terminal' }), true);
    assert.equal(isTerminalFulfillmentFailure({ outcome: 'invalid_request' }), true);
    assert.equal(isTerminalFulfillmentFailure({ outcome: 'unsupported_route' }), true);
    assert.equal(isTerminalFulfillmentFailure({ outcome: 'succeeded' }), false);
    assert.equal(
      isTerminalFulfillmentFailure({ outcome: 'pending_verification', errorCode: 'x' }),
      false,
    );
  });

  it('persistedFulfillmentErrorCode maps AMOUNT_MISMATCH to bucket', () => {
    assert.equal(
      persistedFulfillmentErrorCode({
        outcome: 'invalid_request',
        errorCode: 'AMOUNT_MISMATCH',
      }),
      FULFILLMENT_DB_ERROR.AMOUNT_MISMATCH,
    );
  });

  it('persistedFulfillmentErrorCode prefers explicit provider code when present', () => {
    assert.equal(
      persistedFulfillmentErrorCode({
        outcome: 'failed_retryable',
        errorCode: 'provider_timeout',
      }),
      'provider_timeout',
    );
  });
});
