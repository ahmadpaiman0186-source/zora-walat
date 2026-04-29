import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  parsePhase1FulfillmentJobPayload,
} from '../src/infrastructure/fulfillment/fulfillmentJobContract.js';

describe('fulfillmentJobContract', () => {
  it('accepts canonical v1 payload', () => {
    const r = parsePhase1FulfillmentJobPayload({
      orderId: 'paychk_abc',
      idempotencyKey: 'paychk_abc',
      traceId: 'tr-1',
      v: 1,
    });
    assert.equal(r.ok, true);
    assert.equal(r.payload.orderId, 'paychk_abc');
    assert.equal(r.payload.idempotencyKey, 'paychk_abc');
    assert.equal(r.payload.traceId, 'tr-1');
    assert.equal(r.payload.v, 1);
  });

  it('defaults idempotencyKey to orderId when omitted', () => {
    const r = parsePhase1FulfillmentJobPayload({
      orderId: 'paychk_def',
      traceId: null,
      v: 1,
    });
    assert.equal(r.ok, true);
    assert.equal(r.payload.idempotencyKey, 'paychk_def');
  });

  it('defaults missing v to 1', () => {
    const r = parsePhase1FulfillmentJobPayload({
      orderId: 'paychk_x',
      traceId: null,
    });
    assert.equal(r.ok, true);
    assert.equal(r.payload.v, 1);
  });

  it('rejects wrong schema version', () => {
    const r = parsePhase1FulfillmentJobPayload({
      orderId: 'paychk_x',
      v: 99,
    });
    assert.equal(r.ok, false);
  });
});
