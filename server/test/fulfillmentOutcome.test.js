import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FULFILLMENT_STATUS } from '../src/domain/topupOrder/statuses.js';
import { FULFILLMENT_DB_ERROR } from '../src/domain/topupOrder/fulfillmentErrors.js';
import { fulfillmentResultToStatePatch } from '../src/services/topupFulfillment/fulfillmentOutcome.js';

describe('fulfillmentResultToStatePatch', () => {
  const hash = 'a'.repeat(64);

  it('maps succeeded', () => {
    const p = fulfillmentResultToStatePatch(
      { outcome: 'succeeded', providerReference: 'ref123' },
      hash,
    );
    assert.equal(p.fulfillmentStatus, FULFILLMENT_STATUS.DELIVERED);
    assert.equal(p.fulfillmentReference, 'ref123');
    assert.equal(p.fulfillmentErrorCode, null);
    assert.ok(p.fulfillmentCompletedAt instanceof Date);
  });

  it('maps retryable', () => {
    const p = fulfillmentResultToStatePatch(
      {
        outcome: 'failed_retryable',
        errorMessageSafe: 'timeout',
      },
      hash,
    );
    assert.equal(p.fulfillmentStatus, FULFILLMENT_STATUS.FAILED);
    assert.equal(p.fulfillmentErrorCode, FULFILLMENT_DB_ERROR.RETRYABLE);
  });

  it('maps amount mismatch invalid_request', () => {
    const p = fulfillmentResultToStatePatch(
      {
        outcome: 'invalid_request',
        errorCode: 'AMOUNT_MISMATCH',
        errorMessageSafe: 'bad amount',
      },
      hash,
    );
    assert.equal(p.fulfillmentErrorCode, FULFILLMENT_DB_ERROR.AMOUNT_MISMATCH);
  });

  it('maps unsupported_route', () => {
    const p = fulfillmentResultToStatePatch(
      { outcome: 'unsupported_route', errorMessageSafe: 'no route' },
      hash,
    );
    assert.equal(p.fulfillmentErrorCode, FULFILLMENT_DB_ERROR.UNSUPPORTED_ROUTE);
  });

  it('maps pending_verification to processing', () => {
    const p = fulfillmentResultToStatePatch(
      {
        outcome: 'pending_verification',
        providerReference: 'reloadly_tx_9',
        errorMessageSafe: 'Verifying',
      },
      hash,
    );
    assert.equal(p.fulfillmentStatus, FULFILLMENT_STATUS.PROCESSING);
    assert.equal(p.fulfillmentErrorCode, FULFILLMENT_DB_ERROR.PROVIDER_VERIFYING);
    assert.equal(p.fulfillmentReference, 'reloadly_tx_9');
  });
});
