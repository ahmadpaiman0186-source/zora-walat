/**
 * L19: when BullMQ is disabled, enqueue fails closed with queue_unavailable (no silent drop).
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { enqueuePhase1FulfillmentJob } from '../src/queues/phase1FulfillmentProducer.js';

describe('phase1 fulfillment queue degrade (L19)', () => {
  let prevEnabled;

  before(() => {
    prevEnabled = process.env.FULFILLMENT_QUEUE_ENABLED;
    process.env.FULFILLMENT_QUEUE_ENABLED = 'false';
  });

  after(() => {
    process.env.FULFILLMENT_QUEUE_ENABLED = prevEnabled;
  });

  it('enqueuePhase1FulfillmentJob returns queue_unavailable when queue is disabled', async () => {
    const r = await enqueuePhase1FulfillmentJob('cm_test_order_queue_off', 'trace-l19');
    assert.deepEqual(r, { ok: false, reason: 'queue_unavailable' });
  });
});
