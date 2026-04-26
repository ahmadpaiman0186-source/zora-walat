import assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach } from 'node:test';

import { AIRTIME_OUTCOME } from '../src/domain/fulfillment/airtimeFulfillmentResult.js';
import { fulfillMockAirtime } from '../src/domain/fulfillment/mockAirtimeProvider.js';
import { isRetryableFulfillmentFailure } from '../src/domain/fulfillment/retryPolicy.js';

describe('mockAirtimeProvider', () => {
  const prev = {
    delay: process.env.MOCK_AIRTIME_DELAY_MS,
    sim: process.env.MOCK_AIRTIME_SIMULATE,
  };

  beforeEach(() => {
    delete process.env.MOCK_AIRTIME_DELAY_MS;
    delete process.env.MOCK_AIRTIME_SIMULATE;
  });

  afterEach(() => {
    if (prev.delay != null) process.env.MOCK_AIRTIME_DELAY_MS = prev.delay;
    else delete process.env.MOCK_AIRTIME_DELAY_MS;
    if (prev.sim != null) process.env.MOCK_AIRTIME_SIMULATE = prev.sim;
    else delete process.env.MOCK_AIRTIME_SIMULATE;
  });

  const baseOrder = () => ({
    id: 'order_test_01',
    packageId: 'pkg1',
    operatorKey: 'op',
    recipientNational: '+15551234567',
    amountUsdCents: 500,
    currency: 'USD',
  });

  it('returns deterministic providerReference for same order + correlation', async () => {
    const o = baseOrder();
    const meta = { providerCorrelationId: 'zw_pe:att1:ord_suffix123' };
    const r1 = await fulfillMockAirtime(o, meta);
    const r2 = await fulfillMockAirtime(o, meta);
    assert.equal(r1.outcome, AIRTIME_OUTCOME.SUCCESS);
    assert.equal(r1.providerReference, r2.providerReference);
    assert.ok(String(r1.providerReference).startsWith('mock_ref_'));
    assert.ok(r1.requestSummary?.providerCorrelationId);
  });

  it('does not leak fulfillmentCtx internals into requestSummary', async () => {
    const r = await fulfillMockAirtime(baseOrder(), {
      providerCorrelationId: 'zw_pe:x',
      attemptId: 'secret_attempt',
      traceId: 'secret_trace',
    });
    assert.equal(r.requestSummary?.attemptId, undefined);
    assert.equal(r.requestSummary?.traceId, undefined);
  });

  it('retryable simulate is classified retryable', async () => {
    process.env.MOCK_AIRTIME_SIMULATE = 'retryable';
    const r = await fulfillMockAirtime(baseOrder(), {
      providerCorrelationId: 'zw_pe:att_retry',
    });
    assert.equal(r.outcome, AIRTIME_OUTCOME.FAILURE);
    assert.equal(isRetryableFulfillmentFailure(r), true);
  });

  it('terminal simulate is not retryable', async () => {
    process.env.MOCK_AIRTIME_SIMULATE = 'terminal';
    const r = await fulfillMockAirtime(baseOrder(), {
      providerCorrelationId: 'zw_pe:att_term',
    });
    assert.equal(r.outcome, AIRTIME_OUTCOME.FAILURE);
    assert.equal(isRetryableFulfillmentFailure(r), false);
  });
});
