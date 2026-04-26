import assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach } from 'node:test';

import { ORDER_STATUS } from '../src/constants/orderStatus.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../src/constants/fulfillmentAttemptStatus.js';
import { env } from '../src/config/env.js';
import {
  deriveCustomerTrackingStageForOrder,
  derivePublicLifecycleStage,
  deriveCustomerFailedTerminalKey,
} from '../src/services/transactionsService.js';

const origTimeout = env.processingTimeoutMs;

describe('deriveCustomerTrackingStageForOrder — gap-closure semantics', () => {
  beforeEach(() => {
    env.processingTimeoutMs = 600_000;
  });

  afterEach(() => {
    env.processingTimeoutMs = origTimeout;
  });

  it('returns requires_review when manual review metadata is set', () => {
    const stage = deriveCustomerTrackingStageForOrder(
      {
        orderStatus: ORDER_STATUS.PROCESSING,
        metadata: { manualRequired: true },
      },
      { status: FULFILLMENT_ATTEMPT_STATUS.PROCESSING, responseSummary: null },
    );
    assert.equal(stage, 'requires_review');
  });

  it('returns delayed when paid order is past processing timeout (not auto-retry)', () => {
    env.processingTimeoutMs = 60_000;
    const old = new Date(Date.now() - 120_000);
    const stage = deriveCustomerTrackingStageForOrder(
      {
        orderStatus: ORDER_STATUS.PAID,
        paidAt: old,
        metadata: {},
      },
      { status: FULFILLMENT_ATTEMPT_STATUS.QUEUED, responseSummary: null },
    );
    assert.equal(stage, 'delayed');
  });

  it('prefers retrying over delayed when latest attempt failed (auto-retry)', () => {
    env.processingTimeoutMs = 60_000;
    const old = new Date(Date.now() - 120_000);
    const stage = deriveCustomerTrackingStageForOrder(
      {
        orderStatus: ORDER_STATUS.PROCESSING,
        paidAt: old,
        metadata: {},
      },
      { status: FULFILLMENT_ATTEMPT_STATUS.FAILED, responseSummary: null },
    );
    assert.equal(stage, 'retrying');
  });

  it('exposes failed_terminally when normalized outcome is failed_terminal', () => {
    const stage = deriveCustomerTrackingStageForOrder(
      {
        orderStatus: ORDER_STATUS.FAILED,
        failureReason: 'x',
      },
      {
        status: FULFILLMENT_ATTEMPT_STATUS.FAILED,
        responseSummary: JSON.stringify({
          normalizedOutcome: 'failed_terminal',
        }),
      },
    );
    assert.equal(stage, 'failed_terminally');
    assert.equal(
      deriveCustomerFailedTerminalKey(
        { orderStatus: ORDER_STATUS.FAILED },
        {
          status: FULFILLMENT_ATTEMPT_STATUS.FAILED,
          responseSummary: JSON.stringify({
            normalizedOutcome: 'failed_terminal',
          }),
        },
      ),
      'failed_terminally',
    );
  });

  it('maps delivered tracking to completed lifecycle', () => {
    assert.equal(
      derivePublicLifecycleStage(
        'delivered',
        { orderStatus: ORDER_STATUS.FULFILLED },
        null,
      ),
      'completed',
    );
  });
});
